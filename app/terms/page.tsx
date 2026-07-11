import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Booking terms" };
}

export default async function TermsPage() {
  const settings = await getPropertySettings();

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} tone="on-dark" />

      <section className="section legal-page">
        <p className="section-note">Terms</p>
        <h1>Booking terms</h1>
        <p>{settings.termsSummary}</p>
        <p>
          Check-in: {settings.checkInFrom} to {settings.checkInUntil}. Quiet hours
          from {settings.quietHours}.
        </p>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
