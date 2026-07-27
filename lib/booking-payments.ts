import { revalidatePath } from "next/cache";
import { sendStaffBookingEmail, sendGuestChatNotificationEmail } from "@/lib/email";
import {
  ensureConversationToken,
  getGuestChatUrl,
} from "@/lib/booking-chat";
import { hasCapacityForStay } from "@/lib/booking-capacity";
import { getRoomForBooking } from "@/lib/rooms";
import { getStripe, hasStripeServerConfig } from "@/lib/stripe";
import { createStaffSupabaseClient } from "@/lib/supabase";

async function verifyStripePaymentForBooking({
  bookingId,
  storedPaymentIntentId,
  checkoutSessionId,
  paymentIntentId,
}: {
  bookingId: string;
  storedPaymentIntentId: string | null;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
}) {
  if (!hasStripeServerConfig()) {
    return { ok: false as const, reason: "stripe-not-configured" as const };
  }

  let verifiedPaymentIntentId = paymentIntentId;
  let verifiedCheckoutSessionId = checkoutSessionId;

  if (checkoutSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(checkoutSessionId);
    if (session.payment_status !== "paid") {
      return { ok: false as const, reason: "payment-not-verified" as const };
    }

    const sessionBookingId = session.metadata?.booking_id;
    if (sessionBookingId && sessionBookingId !== bookingId) {
      return { ok: false as const, reason: "payment-mismatch" as const };
    }

    if (typeof session.payment_intent === "string") {
      verifiedPaymentIntentId = session.payment_intent;
    }

    verifiedCheckoutSessionId = session.id;
  }

  if (!verifiedPaymentIntentId) {
    return { ok: false as const, reason: "payment-not-verified" as const };
  }

  const paymentIntent = await getStripe().paymentIntents.retrieve(verifiedPaymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return { ok: false as const, reason: "payment-not-verified" as const };
  }

  const piBookingId = paymentIntent.metadata?.booking_id ?? null;
  const matchesMetadata = piBookingId === bookingId;
  const matchesStored =
    Boolean(storedPaymentIntentId) && storedPaymentIntentId === verifiedPaymentIntentId;

  if (!matchesMetadata && !matchesStored) {
    return { ok: false as const, reason: "payment-mismatch" as const };
  }

  if (
    storedPaymentIntentId &&
    storedPaymentIntentId !== verifiedPaymentIntentId
  ) {
    return { ok: false as const, reason: "payment-mismatch" as const };
  }

  return {
    ok: true as const,
    paymentIntentId: verifiedPaymentIntentId,
    checkoutSessionId: verifiedCheckoutSessionId,
  };
}

export async function fulfillBookingDeposit({
  bookingId,
  checkoutSessionId = null,
  paymentIntentId,
}: {
  bookingId: string;
  checkoutSessionId?: string | null;
  paymentIntentId: string | null;
}) {
  const supabase = createStaffSupabaseClient();
  const { data: booking, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false as const, reason: "missing-booking" as const };
  }

  if (booking.deposit_paid_at) {
    return { ok: true as const, alreadyPaid: true as const };
  }

  if (booking.status !== "pending_payment") {
    return { ok: false as const, reason: "invalid-status" as const };
  }

  let verified;
  try {
    verified = await verifyStripePaymentForBooking({
      bookingId,
      storedPaymentIntentId: booking.stripe_payment_intent_id,
      checkoutSessionId,
      paymentIntentId,
    });
  } catch {
    return { ok: false as const, reason: "payment-not-verified" as const };
  }

  if (!verified.ok) {
    return { ok: false as const, reason: verified.reason };
  }

  const room = await getRoomForBooking(booking.room_id);
  if (room) {
    const hasCapacity = await hasCapacityForStay(
      booking.room_id,
      booking.arrival_date,
      booking.departure_date,
      room.availableCount,
      { excludeBookingId: bookingId },
    );
    if (!hasCapacity) {
      return { ok: false as const, reason: "no-capacity" as const };
    }
  }

  const paidAt = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from("booking_requests")
    .update({
      status: "awaiting",
      deposit_paid_at: paidAt,
      ...(verified.checkoutSessionId
        ? { stripe_checkout_session_id: verified.checkoutSessionId }
        : {}),
      stripe_payment_intent_id: verified.paymentIntentId,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .is("deposit_paid_at", null)
    .select("id");

  if (updateError) {
    return { ok: false as const, reason: "update-failed" as const };
  }

  if (!updatedRows?.length) {
    const { data: again } = await supabase
      .from("booking_requests")
      .select("deposit_paid_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (again?.deposit_paid_at) {
      return { ok: true as const, alreadyPaid: true as const };
    }
    return { ok: false as const, reason: "update-failed" as const };
  }

  await sendStaffBookingEmail({
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    roomName: booking.room_name,
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
    nights: booking.nights,
    estimatedTotal: booking.estimated_total,
    note: booking.note ?? "",
    depositPaid: booking.deposit_amount ?? booking.estimated_total,
    bedSetup: booking.bed_setup,
  });

  if (booking.guest_email !== "walk-in@kamala.local") {
    const token = await ensureConversationToken(bookingId);
    if (token) {
      await sendGuestChatNotificationEmail({
        to: booking.guest_email,
        guestName: booking.guest_name,
        roomName: booking.room_name,
        message:
          "Thank you — we received payment for your stay and your room is reserved. Staff will review your request and message you here with arrival details.",
        chatUrl: getGuestChatUrl(token),
        kind: "welcome",
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");

  return { ok: true as const, alreadyPaid: false as const };
}

export async function releaseBookingReservation(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "pending_payment") {
    return;
  }

  await supabase.from("booking_requests").delete().eq("id", bookingId);
}
