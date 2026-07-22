import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { canCleanupPendingBooking } from "@/lib/booking-payment-race";
import { fulfillBookingDeposit } from "@/lib/booking-payments";
import { getStripe } from "@/lib/stripe";
import { createStaffSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

async function cleanupPendingBooking(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("status, bank_transfer_claimed_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (
    !booking ||
    !canCleanupPendingBooking({
      status: booking.status,
      bankTransferClaimedAt: booking.bank_transfer_claimed_at,
    })
  ) {
    return;
  }

  await supabase
    .from("booking_requests")
    .delete()
    .eq("id", bookingId)
    .eq("status", "pending_payment")
    .is("bank_transfer_claimed_at", null);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata?.booking_id;

    if (bookingId) {
      const result = await fulfillBookingDeposit({
        bookingId,
        paymentIntentId: paymentIntent.id,
      });
      if (!result.ok && shouldRetryFulfill(result.reason)) {
        return NextResponse.json({ error: result.reason }, { status: 500 });
      }
    }
  }

  if (event.type === "payment_intent.canceled") {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata?.booking_id;

    if (bookingId) {
      await cleanupPendingBooking(bookingId);
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId || session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;

    const result = await fulfillBookingDeposit({
      bookingId,
      checkoutSessionId: session.id,
      paymentIntentId,
    });
    if (!result.ok && shouldRetryFulfill(result.reason)) {
      return NextResponse.json({ error: result.reason }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      await cleanupPendingBooking(bookingId);
    }
  }

  return NextResponse.json({ received: true });
}

function shouldRetryFulfill(reason: string) {
  return (
    reason === "update-failed" ||
    reason === "payment-not-verified" ||
    reason === "stripe-not-configured" ||
    reason === "missing-booking"
  );
}
