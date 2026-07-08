import Link from "next/link";
import { fulfillBookingDeposit } from "@/lib/booking-payments";
import { getGuestChatUrl } from "@/lib/booking-chat";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { getStripe, hasStripeServerConfig } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking_id?: string;
    payment_intent?: string;
    redirect_status?: string;
    session_id?: string;
  }>;
}) {
  const {
    booking_id: bookingId,
    payment_intent: paymentIntentId,
    redirect_status: redirectStatus,
    session_id: sessionId,
  } = await searchParams;
  let roomName = "your room";
  let chatUrl: string | null = null;
  let paymentPending = false;

  if (hasStripeServerConfig()) {
    try {
      let resolvedBookingId = bookingId ?? null;
      let resolvedPaymentIntentId = paymentIntentId ?? null;

      if (sessionId) {
        const session = await getStripe().checkout.sessions.retrieve(sessionId);
        resolvedBookingId = session.metadata?.booking_id ?? resolvedBookingId;
        if (!resolvedPaymentIntentId && typeof session.payment_intent === "string") {
          resolvedPaymentIntentId = session.payment_intent;
        }
      }

      if (resolvedPaymentIntentId && !resolvedBookingId) {
        const paymentIntent = await getStripe().paymentIntents.retrieve(resolvedPaymentIntentId);
        resolvedBookingId = paymentIntent.metadata?.booking_id ?? null;
      }

      if (resolvedBookingId) {
        const supabase = createStaffSupabaseClient();
        const { data: booking } = await supabase
          .from("booking_requests")
          .select("room_name, conversation_token, deposit_paid_at")
          .eq("id", resolvedBookingId)
          .maybeSingle();

        if (booking?.room_name) {
          roomName = booking.room_name;
        }

        const paymentSucceeded =
          redirectStatus === "succeeded" ||
          (resolvedPaymentIntentId
            ? (await getStripe().paymentIntents.retrieve(resolvedPaymentIntentId)).status ===
              "succeeded"
            : false);

        if (paymentSucceeded && !booking?.deposit_paid_at) {
          const result = await fulfillBookingDeposit({
            bookingId: resolvedBookingId,
            paymentIntentId: resolvedPaymentIntentId,
          });

          if (result.ok && booking?.conversation_token) {
            chatUrl = getGuestChatUrl(booking.conversation_token);
          } else if (!result.ok) {
            paymentPending = true;
          }
        } else if (booking?.deposit_paid_at && booking.conversation_token) {
          chatUrl = getGuestChatUrl(booking.conversation_token);
        } else if (!paymentSucceeded) {
          paymentPending = true;
        }
      }
    } catch {
      paymentPending = true;
    }
  }

  return (
    <main className="site-shell">
      <section className="section booking-result">
        <p className="section-note">Stripe payment</p>
        <h1>{paymentPending ? "Payment received" : "Your room is reserved."}</h1>
        <p>
          {paymentPending
            ? "Stripe confirmed your payment. We are finalizing your reservation now — refresh in a moment or check your email."
            : `We received your 50% deposit through Stripe and held ${roomName} for your dates. Staff will review the request and message you with arrival details. The remaining balance is due before check-in.`}
        </p>
        {chatUrl ? (
          <>
            <p>
              Save your private conversation link — it is the only way to message
              us about this booking. We also email you when there is a new message.
            </p>
            <p>
              <Link className="button button--primary" href={chatUrl}>
                Open booking conversation
              </Link>
            </p>
          </>
        ) : null}
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
