import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { resolveGuestConversationUrl } from "@/lib/booking-chat";
import { getPropertySettings } from "@/lib/property-settings";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { isLocale, t, tReplace } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BookingRequestedPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; lang?: string; payment?: string }>;
}) {
  const { booking: bookingId, lang, payment } = await searchParams;
  const locale = isLocale(lang) ? lang : "en";
  const isBankTransfer = payment === "bank-transfer";
  const settings = await getPropertySettings();
  let chatUrl: string | null = null;

  if (bookingId) {
    try {
      const supabase = createStaffSupabaseClient();
      const { data } = await supabase
        .from("booking_requests")
        .select("conversation_token, guest_email")
        .eq("id", bookingId)
        .maybeSingle();

      if (data) {
        chatUrl = await resolveGuestConversationUrl({
          bookingId,
          conversationToken: data.conversation_token,
          guestEmail: data.guest_email,
        });
      }
    } catch {
      // Booking details may not be available yet.
    }
  }

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} />
      <section className="section booking-result">
        <h1>
          {isBankTransfer
            ? t(locale, "bankTransferWaitingTitle")
            : t(locale, "requestedTitle")}
        </h1>
        <p>
          {isBankTransfer
            ? t(locale, "bankTransferWaitingBody")
            : tReplace(locale, "requestedBody", {
                property: settings.propertyName,
              })}
        </p>
        {chatUrl ? (
          <>
            <p>{t(locale, "requestedChatHint")}</p>
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
