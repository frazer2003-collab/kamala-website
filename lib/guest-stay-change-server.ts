import type Stripe from "stripe";
import { revalidatePath } from "next/cache";
import type { Room } from "@/lib/content";
import { getPropertyTodayIso } from "@/lib/calendar";
import { checkStayCapacity } from "@/lib/booking-capacity";
import { getBookingByConversationToken, getGuestChatUrl } from "@/lib/booking-chat";
import { quoteRoomStay } from "@/lib/booking-quote";
import { getConfirmedBookings } from "@/lib/booking-requests";
import { formatMoneySuffix, getStripeCurrencyCode } from "@/lib/currency";
import { sendStaffStayChangeEmail } from "@/lib/email";
import {
  canGuestChangeStay,
  isSameStay,
  resolveStayChangeOutcome,
  resolveStayChangePayment,
  type StayChangeEligibility,
  type StayChangeOutcome,
  type StayChangePayMethod,
} from "@/lib/guest-stay-change";
import { resolveBookingStayTotal } from "@/lib/payment-pricing";
import { getPropertySettings } from "@/lib/property-settings";
import { getChannelReservations } from "@/lib/room-blocks";
import {
  findUnitAssignmentConflict,
  getStaffRoomUnits,
  getUnitsForRoomType,
  occupancyFromBooking,
  occupancyFromChannelBlock,
} from "@/lib/room-units";
import { getRoomForBooking } from "@/lib/rooms";
import { parseStayDates } from "@/lib/stay-dates";
import {
  getStripe,
  getStripeMinimumChargeAmount,
  hasStripeConfig,
  hasStripeServerConfig,
} from "@/lib/stripe";
import { isBankTransferAvailable } from "@/lib/bank-transfer";
import { createStaffSupabaseClient, type BookingRequestRow } from "@/lib/supabase";

export const STAY_CHANGE_PAYMENT_KIND = "stay-change";

export type StayChangeTarget = {
  roomId: string;
  arrivalDate: string;
  departureDate: string;
};

export function hasPendingStayChange(booking: BookingRequestRow) {
  return Boolean(
    booking.pending_room_id &&
      booking.pending_arrival_date &&
      booking.pending_departure_date,
  );
}

export function getBookingStayTotal(booking: BookingRequestRow) {
  return resolveBookingStayTotal({
    depositAmount: booking.deposit_amount,
    estimatedTotal: booking.estimated_total,
  });
}

export async function loadStayForChange(token: string): Promise<
  | { status: "invalid" }
  | {
      status: "ok";
      booking: BookingRequestRow;
      eligibility: StayChangeEligibility;
      todayIso: string;
    }
> {
  const booking = await getBookingByConversationToken(token);
  if (!booking) {
    return { status: "invalid" };
  }

  const todayIso = getPropertyTodayIso();
  return {
    status: "ok",
    booking,
    todayIso,
    eligibility: canGuestChangeStay({
      status: booking.status,
      arrivalDate: booking.arrival_date,
      todayIso,
      hasPendingChange: hasPendingStayChange(booking),
    }),
  };
}

/** Room type and doors are both free for the new nights, ignoring the guest's own stay. */
export async function checkStayChangeAvailability(
  booking: BookingRequestRow,
  room: Room,
  arrivalDate: string,
  departureDate: string,
): Promise<{ ok: true } | { ok: false; reason: "unavailable" | "verify-failed" }> {
  const capacity = await checkStayCapacity(
    room.id,
    arrivalDate,
    departureDate,
    room.availableCount,
    { excludeBookingId: booking.id },
  );
  if (!capacity.ok) {
    return capacity;
  }

  const door = await findFreeDoor(booking, room.id, arrivalDate, departureDate);
  return door.ok ? { ok: true } : { ok: false, reason: "unavailable" };
}

/**
 * Keeps the guest's door when it still fits the new stay; otherwise clears it
 * so staff assign one. `ok` is false only when every door is taken.
 */
async function findFreeDoor(
  booking: BookingRequestRow,
  roomId: string,
  arrivalDate: string,
  departureDate: string,
): Promise<{ ok: boolean; keepUnitId: string | null }> {
  const [{ units }, confirmed, channels] = await Promise.all([
    getStaffRoomUnits(),
    getConfirmedBookings(),
    getChannelReservations(),
  ]);
  const typeUnits = getUnitsForRoomType(units, roomId);
  if (typeUnits.length === 0) {
    return { ok: true, keepUnitId: null };
  }

  const occupancies = [
    ...confirmed.bookings.map(occupancyFromBooking),
    ...channels.blocks.map(occupancyFromChannelBlock),
  ];
  const freeUnitIds = typeUnits
    .filter(
      (unit) =>
        !findUnitAssignmentConflict({
          units,
          unitId: unit.id,
          arrivalDate,
          departureDate,
          excludeId: booking.id,
          occupancies,
        }),
    )
    .map((unit) => unit.id);

  const keepUnitId =
    booking.room_unit_id && freeUnitIds.includes(booking.room_unit_id)
      ? booking.room_unit_id
      : null;
  return { ok: freeUnitIds.length > 0, keepUnitId };
}

export type StayChangeQuote =
  | {
      ok: true;
      room: Room;
      target: StayChangeTarget;
      nights: number;
      newTotal: number;
      outcome: StayChangeOutcome;
    }
  | { ok: false; message: string };

export async function quoteStayChange(
  booking: BookingRequestRow,
  target: StayChangeTarget,
): Promise<StayChangeQuote> {
  const stay = parseStayDates(target.arrivalDate, target.departureDate);
  if (!stay) {
    return { ok: false, message: "Choose a check-in and check-out date." };
  }

  const room = await getRoomForBooking(target.roomId);
  if (!room) {
    return { ok: false, message: "That room is no longer available. Pick another." };
  }

  if (
    isSameStay(
      {
        roomId: booking.room_id,
        arrivalDate: booking.arrival_date,
        departureDate: booking.departure_date,
      },
      target,
    )
  ) {
    return { ok: false, message: "This is your current stay. Pick a new room or dates." };
  }

  const availability = await checkStayChangeAvailability(
    booking,
    room,
    stay.arrival,
    stay.departure,
  );
  if (!availability.ok) {
    return {
      ok: false,
      message:
        availability.reason === "verify-failed"
          ? "We couldn’t check availability just now. Please try again."
          : "Those dates are taken for this room. Pick other dates.",
    };
  }

  const quote = await quoteRoomStay(
    room.id,
    room.rate,
    stay.arrival,
    stay.departure,
    booking.discount_code_text ?? undefined,
  );
  const settings = await getPropertySettings();

  return {
    ok: true,
    room,
    target: {
      roomId: room.id,
      arrivalDate: stay.arrival,
      departureDate: stay.departure,
    },
    nights: stay.nights,
    newTotal: quote.total,
    outcome: resolveStayChangeOutcome({
      currentTotal: getBookingStayTotal(booking),
      newTotal: quote.total,
      payment: resolveStayChangePayment({
        depositPaidAt: booking.deposit_paid_at,
        stripePaymentIntentId: booking.stripe_payment_intent_id,
      }),
      minimumCardCharge: getStripeMinimumChargeAmount(settings.currency),
      cardAvailable: hasStripeConfig(),
      bankAvailable: isBankTransferAvailable(
        {
          promptPayId: settings.promptPayId,
          bankName: settings.bankName,
          accountName: settings.accountName,
          accountNumber: settings.accountNumber,
        },
        settings.currency,
      ),
    }),
  };
}

function revalidateStayChange() {
  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
}

/**
 * Moves the stay only if it still matches `from`, so a webhook and a return
 * page racing each other cannot apply the same change twice.
 */
async function moveStay({
  booking,
  room,
  target,
  newTotal,
  extra = {},
}: {
  booking: BookingRequestRow;
  room: Room;
  target: StayChangeTarget;
  newTotal: number;
  extra?: Partial<Omit<BookingRequestRow, "id" | "created_at">>;
}): Promise<{ ok: true; booking: BookingRequestRow } | { ok: false }> {
  const stay = parseStayDates(target.arrivalDate, target.departureDate);
  if (!stay) {
    return { ok: false };
  }

  const door = await findFreeDoor(booking, room.id, stay.arrival, stay.departure);
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .update({
      room_id: room.id,
      room_name: room.name,
      arrival_date: stay.arrival,
      departure_date: stay.departure,
      nights: stay.nights,
      estimated_total: newTotal,
      deposit_amount: newTotal,
      room_unit_id: door.keepUnitId,
      ...extra,
    })
    .eq("id", booking.id)
    .eq("room_id", booking.room_id)
    .eq("arrival_date", booking.arrival_date)
    .eq("departure_date", booking.departure_date)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false };
  }

  revalidateStayChange();
  return { ok: true, booking: data };
}

async function notifyStaff(
  booking: BookingRequestRow,
  kind: "changed" | "transfer-to-confirm" | "refund-to-send",
  amount: number,
) {
  const settings = await getPropertySettings();
  await sendStaffStayChangeEmail({
    kind,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    roomName: booking.room_name,
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
    pendingRoomName: booking.pending_room_id
      ? (await getRoomForBooking(booking.pending_room_id))?.name ?? booking.pending_room_id
      : null,
    pendingArrivalDate: booking.pending_arrival_date ?? null,
    pendingDepartureDate: booking.pending_departure_date ?? null,
    amountLabel: amount > 0 ? formatMoneySuffix(amount, settings.currency) : null,
    chatUrl: booking.conversation_token ? getGuestChatUrl(booking.conversation_token) : null,
  }).catch(() => null);
}

export type ApplyStayChangeResult =
  | { ok: true; result: "applied" }
  | { ok: true; result: "bank-pending" }
  | { ok: true; result: "card"; clientSecret: string; totalDue: number }
  | { ok: false; message: string };

const STALE_MESSAGE = "Your stay changed while you were choosing. Reload the page and try again.";

/** Acts on a fresh quote: applies, refunds, holds for transfer, or starts a card top-up. */
export async function applyStayChange(
  booking: BookingRequestRow,
  quote: Extract<StayChangeQuote, { ok: true }>,
  method?: StayChangePayMethod,
): Promise<ApplyStayChangeResult> {
  const { outcome, room, target } = quote;

  switch (outcome.kind) {
    case "same":
    case "unpaid": {
      const moved = await moveStay({ booking, room, target, newTotal: outcome.newTotal });
      if (!moved.ok) {
        return { ok: false, message: STALE_MESSAGE };
      }
      await notifyStaff(moved.booking, "changed", 0);
      return { ok: true, result: "applied" };
    }

    case "refund-card": {
      if (!booking.stripe_payment_intent_id || !hasStripeServerConfig()) {
        return { ok: false, message: "We couldn’t refund your card automatically. Message us and we’ll sort it out." };
      }
      const moved = await moveStay({ booking, room, target, newTotal: outcome.newTotal });
      if (!moved.ok) {
        return { ok: false, message: STALE_MESSAGE };
      }
      try {
        await getStripe().refunds.create(
          {
            payment_intent: booking.stripe_payment_intent_id,
            amount: outcome.difference * 100,
            metadata: { kind: STAY_CHANGE_PAYMENT_KIND, booking_id: booking.id },
          },
          { idempotencyKey: `stay-change-refund-${booking.id}-${target.roomId}-${target.arrivalDate}-${target.departureDate}` },
        );
      } catch {
        await createStaffSupabaseClient()
          .from("booking_requests")
          .update({
            room_id: booking.room_id,
            room_name: booking.room_name,
            arrival_date: booking.arrival_date,
            departure_date: booking.departure_date,
            nights: booking.nights,
            estimated_total: booking.estimated_total,
            deposit_amount: booking.deposit_amount,
            room_unit_id: booking.room_unit_id,
          })
          .eq("id", booking.id);
        revalidateStayChange();
        return { ok: false, message: "We couldn’t refund your card just now, so your stay is unchanged. Please try again or message us." };
      }
      await notifyStaff(moved.booking, "changed", 0);
      return { ok: true, result: "applied" };
    }

    case "refund-bank": {
      const moved = await moveStay({
        booking,
        room,
        target,
        newTotal: outcome.newTotal,
        extra: { refund_due: (booking.refund_due ?? 0) + outcome.difference },
      });
      if (!moved.ok) {
        return { ok: false, message: STALE_MESSAGE };
      }
      await notifyStaff(moved.booking, "refund-to-send", outcome.difference);
      return { ok: true, result: "applied" };
    }

    case "pay-more": {
      const payBy = method ?? outcome.preferred;
      if (payBy === "card" && outcome.card) {
        return startCardTopUp(booking, quote, outcome.difference, outcome.card);
      }
      if (payBy !== "bank" || !outcome.bank) {
        return { ok: false, message: "That payment method isn’t available right now. Message us to change your stay." };
      }

      const { data, error } = await createStaffSupabaseClient()
        .from("booking_requests")
        .update({
          pending_room_id: target.roomId,
          pending_arrival_date: target.arrivalDate,
          pending_departure_date: target.departureDate,
          pending_balance: outcome.difference,
        })
        .eq("id", booking.id)
        .is("pending_room_id", null)
        .eq("arrival_date", booking.arrival_date)
        .eq("departure_date", booking.departure_date)
        .select("*")
        .maybeSingle();
      if (error || !data) {
        return { ok: false, message: STALE_MESSAGE };
      }
      revalidatePath("/staff");
      await notifyStaff(data, "transfer-to-confirm", outcome.difference);
      return { ok: true, result: "bank-pending" };
    }
  }
}

async function startCardTopUp(
  booking: BookingRequestRow,
  quote: Extract<StayChangeQuote, { ok: true }>,
  difference: number,
  card: { surcharge: number; totalDue: number },
): Promise<ApplyStayChangeResult> {
  if (!hasStripeServerConfig()) {
    return { ok: false, message: "Card payments aren’t available right now. Message us to change your stay." };
  }
  const { room, target, newTotal } = quote;
  const settings = await getPropertySettings();
  try {
    const intent = await getStripe().paymentIntents.create({
      amount: card.totalDue * 100,
      currency: getStripeCurrencyCode(settings.currency),
      receipt_email: booking.guest_email,
      description: `${settings.propertyName} stay change — ${room.name}`,
      payment_method_types: ["card"],
      metadata: {
        kind: STAY_CHANGE_PAYMENT_KIND,
        stay_change_booking_id: booking.id,
        from_room_id: booking.room_id,
        from_arrival: booking.arrival_date,
        from_departure: booking.departure_date,
        to_room_id: target.roomId,
        to_arrival: target.arrivalDate,
        to_departure: target.departureDate,
        new_total: String(newTotal),
        stay_difference: String(difference),
        bank_charge: String(card.surcharge),
      },
    });
    if (!intent.client_secret) {
      return { ok: false, message: "We couldn’t start the card payment. Please try again." };
    }
    return {
      ok: true,
      result: "card",
      clientSecret: intent.client_secret,
      totalDue: card.totalDue,
    };
  } catch {
    return { ok: false, message: "We couldn’t start the card payment. Please try again." };
  }
}

export function isStayChangePaymentIntent(intent: Stripe.PaymentIntent) {
  return intent.metadata?.kind === STAY_CHANGE_PAYMENT_KIND;
}

export type PaidStayChangeResult =
  | { status: "applied" | "already-applied" }
  | { status: "refunded"; reason: "unavailable" | "stay-changed" }
  | { status: "invalid" };

/**
 * Applies a card top-up after Stripe reports success. Called from both the
 * webhook and the guest's return page; safe to run twice. If the new nights
 * were taken while the guest paid, the extra charge is refunded in full.
 */
export async function applyPaidStayChange(
  intent: Stripe.PaymentIntent,
): Promise<PaidStayChangeResult> {
  const meta = intent.metadata ?? {};
  if (!isStayChangePaymentIntent(intent) || intent.status !== "succeeded") {
    return { status: "invalid" };
  }

  const bookingId = meta.stay_change_booking_id;
  const newTotal = Number(meta.new_total);
  const target: StayChangeTarget = {
    roomId: meta.to_room_id ?? "",
    arrivalDate: meta.to_arrival ?? "",
    departureDate: meta.to_departure ?? "",
  };
  if (!bookingId || !Number.isFinite(newTotal) || !target.roomId) {
    return { status: "invalid" };
  }

  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return { status: "invalid" };
  }

  const atTarget =
    isSameStay(
      {
        roomId: booking.room_id,
        arrivalDate: booking.arrival_date,
        departureDate: booking.departure_date,
      },
      target,
    ) && getBookingStayTotal(booking) === newTotal;
  if (atTarget) {
    return { status: "already-applied" };
  }

  const refundTopUp = async (reason: "unavailable" | "stay-changed") => {
    await getStripe()
      .refunds.create(
        { payment_intent: intent.id },
        { idempotencyKey: `stay-change-void-${intent.id}` },
      )
      .catch(() => null);
    return { status: "refunded" as const, reason };
  };

  const stillAtOrigin =
    booking.status === "confirmed" &&
    booking.room_id === meta.from_room_id &&
    booking.arrival_date === meta.from_arrival &&
    booking.departure_date === meta.from_departure;
  if (!stillAtOrigin) {
    return refundTopUp("stay-changed");
  }

  const room = await getRoomForBooking(target.roomId);
  if (!room) {
    return refundTopUp("unavailable");
  }

  const availability = await checkStayChangeAvailability(
    booking,
    room,
    target.arrivalDate,
    target.departureDate,
  );
  if (!availability.ok) {
    return refundTopUp("unavailable");
  }

  const moved = await moveStay({ booking, room, target, newTotal });
  if (!moved.ok) {
    const { data: latest } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();
    if (
      latest &&
      isSameStay(
        {
          roomId: latest.room_id,
          arrivalDate: latest.arrival_date,
          departureDate: latest.departure_date,
        },
        target,
      )
    ) {
      return { status: "already-applied" };
    }
    return refundTopUp("stay-changed");
  }

  await notifyStaff(moved.booking, "changed", 0);
  return { status: "applied" };
}

/** Staff saw the guest's top-up transfer: re-check the nights, then move the stay. */
export async function confirmPendingStayChange(bookingId: string): Promise<
  { ok: true; booking: BookingRequestRow } | { ok: false; reason: "missing" | "unavailable" | "stale" }
> {
  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || !hasPendingStayChange(booking)) {
    return { ok: false, reason: "missing" };
  }

  const room = await getRoomForBooking(booking.pending_room_id!);
  if (!room) {
    return { ok: false, reason: "unavailable" };
  }

  const target: StayChangeTarget = {
    roomId: room.id,
    arrivalDate: booking.pending_arrival_date!,
    departureDate: booking.pending_departure_date!,
  };
  const availability = await checkStayChangeAvailability(
    booking,
    room,
    target.arrivalDate,
    target.departureDate,
  );
  if (!availability.ok) {
    return { ok: false, reason: "unavailable" };
  }

  const newTotal = getBookingStayTotal(booking) + (booking.pending_balance ?? 0);
  const moved = await moveStay({
    booking,
    room,
    target,
    newTotal,
    extra: {
      pending_room_id: null,
      pending_arrival_date: null,
      pending_departure_date: null,
      pending_balance: null,
    },
  });
  return moved.ok ? moved : { ok: false, reason: "stale" };
}

export async function clearPendingStayChange(bookingId: string) {
  const { data } = await createStaffSupabaseClient()
    .from("booking_requests")
    .update({
      pending_room_id: null,
      pending_arrival_date: null,
      pending_departure_date: null,
      pending_balance: null,
    })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();
  revalidatePath("/staff");
  return data;
}

export async function clearStayChangeRefund(bookingId: string) {
  const { data } = await createStaffSupabaseClient()
    .from("booking_requests")
    .update({ refund_due: 0 })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();
  revalidatePath("/staff");
  return data;
}
