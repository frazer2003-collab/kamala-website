import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getGuestChatUrl } from "@/lib/booking-chat";
import { getPropertySettings } from "@/lib/property-settings";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { isLocale, t } from "@/lib/i18n";

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
        .select("conversation_token")
        .eq("id", bookingId)
        .maybeSingle();

      if (data?.conversation_token) {
        chatUrl = getGuestChatUrl(data.conversation_token);
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
            : "We received your booking request."}
        </h1>
        <p>
          {isBankTransfer
            ? t(locale, "bankTransferWaitingBody")
            : `Staff at ${settings.propertyName} will review your dates and reply with confirmation details. No card payment was taken online.`}
        </p>
        {chatUrl ? (
          <p>
            <Link className="button button--primary" href={chatUrl}>
              Open booking conversation
            </Link>
          </p>
        ) : null}
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
