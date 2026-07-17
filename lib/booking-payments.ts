import { revalidatePath } from "next/cache";
import { sendStaffBookingEmail, sendGuestChatNotificationEmail } from "@/lib/email";
import {
  ensureConversationToken,
  getGuestChatUrl,
} from "@/lib/booking-chat";
import { hasCapacityForStay } from "@/lib/booking-capacity";
import { getRoomForBooking } from "@/lib/rooms";
import { createStaffSupabaseClient } from "@/lib/supabase";

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

  const { error: updateError } = await supabase
    .from("booking_requests")
    .update({
      status: "awaiting",
      deposit_paid_at: new Date().toISOString(),
      ...(checkoutSessionId ? { stripe_checkout_session_id: checkoutSessionId } : {}),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", bookingId);

  if (updateError) {
    return { ok: false as const, reason: "update-failed" as const };
  }

  if (room) {
    await supabase
      .from("rooms")
      .update({ available_count: Math.max(0, room.availableCount - 1) })
      .eq("id", booking.room_id);
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

  if (!booking?.deposit_paid_at) {
    return { released: false as const };
  }

  const room = await getRoomForBooking(booking.room_id);
  if (room) {
    await supabase
      .from("rooms")
      .update({ available_count: room.availableCount + 1 })
      .eq("id", booking.room_id);
  }

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");

  return { released: true as const, booking };
}
