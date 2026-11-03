/**
 * Sends the staff refund notice for a booking that was already refunded.
 *   vercel env run -e production -- npx tsx scripts/send-late-refund-notice.ts <booking-id>
 */
import { getGuestChatUrl } from "@/lib/booking-chat";
import { formatMoneySuffix } from "@/lib/currency";
import { sendStaffStayChangeEmail } from "@/lib/email";
import { getPropertySettings } from "@/lib/property-settings";
import { getStripe } from "@/lib/stripe";
import { createStaffSupabaseClient } from "@/lib/supabase";

const bookingId = process.argv[2];
if (!bookingId) {
  console.error("Usage: send-late-refund-notice.ts <booking-id>");
  process.exit(1);
}

async function main() {
  const { data: booking, error } = await createStaffSupabaseClient()
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    console.error(error?.message ?? "Booking not found");
    process.exit(1);
  }

  let cardRefundFailed = false;
  let startedOn = "23 October 2026";

  if (booking.stripe_payment_intent_id) {
    const refunds = await getStripe().refunds.list({
      payment_intent: booking.stripe_payment_intent_id,
      limit: 5,
    });
    const refund = refunds.data[0];
    if (!refund || refund.status === "failed" || refund.status === "canceled") {
      cardRefundFailed = true;
      console.log(refund ? `stripe refund ${refund.status}` : "no stripe refund on this payment");
    } else {
      startedOn = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      }).format(new Date(refund.created * 1000));
      console.log(`stripe refund ${refund.status} since ${startedOn}`);
    }
  }

  const settings = await getPropertySettings();
  const amount = booking.deposit_amount ?? booking.estimated_total;
  const result = await sendStaffStayChangeEmail({
    kind: booking.stripe_payment_intent_id ? "refund-card" : "refund-to-send",
    refundReason: "declined",
    cardRefundFailed,
    preface: `This note is late. The request was declined on ${startedOn}.`,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    roomName: booking.room_name,
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
    pendingRoomName: null,
    pendingArrivalDate: null,
    pendingDepartureDate: null,
    amountLabel: amount > 0 ? formatMoneySuffix(amount, settings.currency) : null,
    chatUrl: booking.conversation_token ? getGuestChatUrl(booking.conversation_token) : null,
  });

  if (!result.ok) {
    console.error(result.reason);
    process.exit(1);
  }

  console.log(`sent for ${booking.guest_name}`);
}

void main();
