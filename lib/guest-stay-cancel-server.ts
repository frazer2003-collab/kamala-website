import { after } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getBookingByConversationToken,
  getGuestChatUrl,
  recordStaffChatMessage,
} from "@/lib/booking-chat";
import { formatMoneySuffix } from "@/lib/currency";
import { releaseDiscountCodeUse } from "@/lib/discount-codes";
import { sendGuestBookingEmail, sendStaffStayChangeEmail } from "@/lib/email";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  canGuestCancelStay,
  type StayCancelEligibility,
} from "@/lib/guest-stay-change";
import { hasPendingStayChange } from "@/lib/guest-stay-change-server";
import { cardRefundKeepingCharge, resolveBookingStayTotal } from "@/lib/payment-pricing";
import { getPropertySettings } from "@/lib/property-settings";
import {
  guestBankRefundSentence,
  guestCardRefundSentence,
} from "@/lib/refund-notice";
import { countStayNights } from "@/lib/stay-dates";
import { getStripe, hasStripeConfig } from "@/lib/stripe";
import { isStripeChargeAlreadyRefunded } from "@/lib/stripe-refund";
import { createStaffSupabaseClient, type BookingRequestRow } from "@/lib/supabase";

export function guestCancelEligibilityForBooking(
  booking: BookingRequestRow,
  todayIso = getPropertyTodayIso(),
): StayCancelEligibility {
  return canGuestCancelStay({
    status: booking.status,
    arrivalDate: booking.arrival_date,
    todayIso,
    hasPendingChange: hasPendingStayChange(booking),
    daysUntilArrival: countStayNights(todayIso, booking.arrival_date),
  });
}

async function refundCardKeepingCharge(booking: BookingRequestRow): Promise<
  | { ok: true; already: boolean; refundMajor: number; keptMajor: number }
  | { ok: false }
> {
  if (!booking.stripe_payment_intent_id || !hasStripeConfig()) {
    return { ok: false };
  }

  try {
    const stripe = getStripe();
    const prior = await stripe.refunds.list({
      payment_intent: booking.stripe_payment_intent_id,
      limit: 100,
    });
    const intent = await stripe.paymentIntents.retrieve(
      booking.stripe_payment_intent_id,
    );
    const covered = prior.data
      .filter((refund) => refund.status === "succeeded" || refund.status === "pending")
      .reduce((sum, refund) => sum + refund.amount, 0);
    const metaStay = Number(intent.metadata?.stay_total);
    const stayMajor =
      Number.isFinite(metaStay) && metaStay > 0
        ? metaStay
        : Math.max(0, Math.round(booking.deposit_amount ?? booking.estimated_total ?? 0));
    const decision = cardRefundKeepingCharge({
      amountReceivedMinor: intent.amount_received,
      alreadyRefundedMinor: covered,
      stayTotalMajor: stayMajor,
    });
    const keptMajor = decision.keptChargeMinor / 100;

    if (decision.action === "done") {
      return { ok: true, already: true, refundMajor: 0, keptMajor };
    }

    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: decision.amountMinor,
      metadata: {
        booking_id: booking.id,
        kind: "stay-refund",
        kept_charge: String(keptMajor),
        source: "guest-cancel",
      },
    });

    return {
      ok: true,
      already: false,
      refundMajor: decision.amountMinor / 100,
      keptMajor,
    };
  } catch (error) {
    if (!isStripeChargeAlreadyRefunded(error)) {
      return { ok: false };
    }
    return { ok: true, already: true, refundMajor: 0, keptMajor: 0 };
  }
}

/**
 * Guest self-cancel for a confirmed stay more than 3 days before check-in.
 * Card: refund stay (keep processing fee). Bank: queue refund_due for Transfers.
 */
export async function cancelGuestStayByToken(
  token: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const booking = await getBookingByConversationToken(token);
  if (!booking) {
    return { ok: false, message: "This link is not valid." };
  }

  const eligibility = guestCancelEligibilityForBooking(booking);
  if (!eligibility.ok) {
    if (eligibility.reason === "too-close") {
      return {
        ok: false,
        message:
          "Online cancel is only available more than 3 days before check-in. Message us and we’ll help.",
      };
    }
    if (eligibility.reason === "change-pending") {
      return {
        ok: false,
        message: "A stay change is still pending. Message us if you need to cancel instead.",
      };
    }
    return {
      ok: false,
      message: "This booking can’t be cancelled online. Message us and we’ll help.",
    };
  }

  const settings = await getPropertySettings();
  const stayAmount = resolveBookingStayTotal({
    depositAmount: booking.deposit_amount,
    estimatedTotal: booking.estimated_total ?? 0,
  });
  const amountLabel =
    stayAmount > 0 ? formatMoneySuffix(stayAmount, settings.currency) : null;
  const chatUrl = booking.conversation_token
    ? getGuestChatUrl(booking.conversation_token)
    : null;
  const paid = Boolean(booking.deposit_paid_at);
  const paidByCard = Boolean(booking.stripe_payment_intent_id);
  const supabase = createStaffSupabaseClient();

  let keptChargeLabel: string | null = null;
  let refundMajor = stayAmount;

  if (paid && paidByCard) {
    const cardRefund = await refundCardKeepingCharge(booking);
    if (!cardRefund.ok) {
      return {
        ok: false,
        message:
          "We couldn’t refund your card automatically. Message us and we’ll sort the cancel and refund.",
      };
    }
    refundMajor = cardRefund.already ? stayAmount : cardRefund.refundMajor;
    keptChargeLabel =
      cardRefund.keptMajor > 0
        ? formatMoneySuffix(cardRefund.keptMajor, settings.currency)
        : null;
    const refundLabel =
      refundMajor > 0
        ? formatMoneySuffix(refundMajor, settings.currency)
        : amountLabel;

    await sendStaffStayChangeEmail({
      kind: "refund-card",
      refundReason: "cancelled",
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      roomName: booking.room_name,
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      pendingRoomName: null,
      pendingArrivalDate: null,
      pendingDepartureDate: null,
      amountLabel: refundLabel,
      keptChargeLabel,
      chatUrl,
    }).catch(() => null);

    if (refundLabel) {
      await recordStaffChatMessage({
        booking: { ...booking, status: "declined" },
        body: guestCardRefundSentence(refundLabel, keptChargeLabel),
      }).catch(() => null);
    }
  } else if (paid) {
    await sendStaffStayChangeEmail({
      kind: "refund-to-send",
      refundReason: "cancelled",
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      roomName: booking.room_name,
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      pendingRoomName: null,
      pendingArrivalDate: null,
      pendingDepartureDate: null,
      amountLabel,
      chatUrl,
    }).catch(() => null);

    if (amountLabel) {
      await recordStaffChatMessage({
        booking: { ...booking, status: "declined" },
        body: guestBankRefundSentence(amountLabel),
      }).catch(() => null);
    }
  }

  if (booking.discount_code_id) {
    await releaseDiscountCodeUse(booking.discount_code_id);
  }

  const declinePayload: {
    status: "declined";
    stay_end_reason: "cancellation";
    refund_due?: number;
  } = {
    status: "declined",
    stay_end_reason: "cancellation",
  };
  if (paid && !paidByCard && stayAmount > 0) {
    declinePayload.refund_due = stayAmount;
  }

  const { error } = await supabase
    .from("booking_requests")
    .update(declinePayload)
    .eq("id", booking.id);

  if (error) {
    const fallback: { status: "declined"; refund_due?: number } = {
      status: "declined",
    };
    if (declinePayload.refund_due) {
      fallback.refund_due = declinePayload.refund_due;
    }
    if (/stay_end_reason|refund_due|schema cache|Could not find/i.test(error.message)) {
      const { error: fallbackError } = await supabase
        .from("booking_requests")
        .update(fallback)
        .eq("id", booking.id);
      if (fallbackError) {
        return {
          ok: false,
          message: "We couldn’t cancel just now. Message us and we’ll help.",
        };
      }
    } else {
      return {
        ok: false,
        message: "We couldn’t cancel just now. Message us and we’ll help.",
      };
    }
  }

  if (booking.guest_email && booking.guest_email !== "walk-in@kamala.local") {
    await sendGuestBookingEmail({
      to: booking.guest_email,
      subject: "Your Kamala booking was cancelled",
      body: paid
        ? `Your stay from ${booking.arrival_date} to ${booking.departure_date} is cancelled. ${
            paidByCard
              ? "Your card refund is on the way (processing fees are kept per our cancellation policy)."
              : "We will refund your bank transfer shortly — reply on your conversation link if we need your account details."
          }`
        : `Your stay from ${booking.arrival_date} to ${booking.departure_date} is cancelled. No payment was taken.`,
    }).catch(() => null);
  }

  after(() =>
    import("@/lib/staff-desk-notifications")
      .then(({ recordStaffDeskNotification }) =>
        recordStaffDeskNotification({
          kind: "booking_cancelled",
          title: `${booking.guest_name} · cancelled`,
          body: `${booking.room_name} · ${booking.arrival_date} → ${booking.departure_date}`,
          bookingId: booking.id,
          stayArrival: booking.arrival_date,
          stayDeparture: booking.departure_date,
          href:
            paid && !paidByCard
              ? `/staff/transfers?booking=${encodeURIComponent(booking.id)}&refund=needed`
              : "/staff/transfers",
        }),
      )
      .catch(() => null),
  );

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/transfers");
  revalidatePath("/staff/calendar");
  revalidatePath("/staff/reservations");
  revalidatePath("/booking/messages");
  revalidatePath("/booking/change");

  return { ok: true };
}
