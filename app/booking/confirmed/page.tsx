import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { fulfillBookingDeposit } from "@/lib/booking-payments";
import { getGuestChatUrl } from "@/lib/booking-chat";
import { getRequestGuestLocale } from "@/lib/guest-locale";
import { t, tReplace } from "@/lib/i18n";
import { getPropertySettings } from "@/lib/property-settings";
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
    locale?: string;
  }>;
}) {
  const {
    booking_id: bookingId,
    payment_intent: paymentIntentId,
    session_id: sessionId,
    locale: localeParam,
  } = await searchParams;
  const locale = await getRequestGuestLocale(localeParam);
  const settings = await getPropertySettings();
  let roomName = locale === "th" ? "ห้องของคุณ" : "your room";
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

        // Never trust redirect_status alone — only Stripe-verified PaymentIntents.
        if (!booking?.deposit_paid_at && (resolvedPaymentIntentId || sessionId)) {
          const result = await fulfillBookingDeposit({
            bookingId: resolvedBookingId,
            paymentIntentId: resolvedPaymentIntentId,
            checkoutSessionId: sessionId ?? null,
          });

          if (result.ok) {
            const { data: paidBooking } = await supabase
              .from("booking_requests")
              .select("conversation_token")
              .eq("id", resolvedBookingId)
              .maybeSingle();
            if (paidBooking?.conversation_token) {
              chatUrl = getGuestChatUrl(paidBooking.conversation_token);
            } else if (booking?.conversation_token) {
              chatUrl = getGuestChatUrl(booking.conversation_token);
            }
          } else {
            paymentPending = true;
          }
        } else if (booking?.deposit_paid_at && booking.conversation_token) {
          chatUrl = getGuestChatUrl(booking.conversation_token);
        } else if (!booking?.deposit_paid_at) {
          paymentPending = true;
        }
      } else {
        paymentPending = true;
      }
    } catch {
      paymentPending = true;
    }
  }

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} />
      <section className="section booking-result">
        <h1>
          {paymentPending
            ? t(locale, "confirmedPendingTitle")
            : t(locale, "confirmedTitle")}
        </h1>
        <p>
          {paymentPending
            ? t(locale, "confirmedPendingBody")
            : tReplace(locale, "confirmedBody", { room: roomName })}
        </p>
        {chatUrl ? (
          <>
            <p>{t(locale, "confirmedChatHint")}</p>
            <p>
              <Link className="button button--primary" href={chatUrl}>
                {t(locale, "openBookingConversation")}
              </Link>
            </p>
          </>
        ) : null}
        <Link className="button button--secondary" href="/">
          {t(locale, "backToHome")}
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
