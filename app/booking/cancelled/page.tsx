import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getRequestGuestLocale } from "@/lib/guest-locale";
import { t } from "@/lib/i18n";
import { getPropertySettings } from "@/lib/property-settings";
import { createStaffSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BookingCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string; locale?: string }>;
}) {
  const { booking_id: bookingId, locale: localeParam } = await searchParams;
  const locale = await getRequestGuestLocale(localeParam);
  const settings = await getPropertySettings();

  if (bookingId) {
    try {
      const supabase = createStaffSupabaseClient();
      await supabase
        .from("booking_requests")
        .delete()
        .eq("id", bookingId)
        .eq("status", "pending_payment");
    } catch {
      // Unpaid bookings can be cleaned up manually if needed.
    }
  }

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} />
      <section className="section booking-result">
        <h1>{t(locale, "cancelledTitle")}</h1>
        <p>{t(locale, "cancelledBody")}</p>
        <Link className="button button--primary" href="/#booking">
          {t(locale, "returnToBooking")}
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
