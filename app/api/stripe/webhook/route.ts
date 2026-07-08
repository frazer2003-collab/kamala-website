import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fulfillBookingDeposit } from "@/lib/booking-payments";
import { getStripe } from "@/lib/stripe";
import { createStaffSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

async function cleanupPendingBooking(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .delete()
    .eq("id", bookingId)
    .eq("status", "pending_payment");
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
      await fulfillBookingDeposit({
        bookingId,
        paymentIntentId: paymentIntent.id,
      });
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

    await fulfillBookingDeposit({
      bookingId,
      checkoutSessionId: session.id,
      paymentIntentId,
    });
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
