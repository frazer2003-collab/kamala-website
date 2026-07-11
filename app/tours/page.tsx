import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { ToursCatalog } from "@/components/tours-catalog";
import { getPropertySettings } from "@/lib/property-settings";
import { getPublicTours } from "@/lib/tours";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  return {
    title: `Tours`,
    description: `Local Chiang Mai tours and experiences arranged through ${settings.propertyName}.`,
  };
}

export default async function ToursPage() {
  const [settings, tours] = await Promise.all([getPropertySettings(), getPublicTours()]);

  return (
    <main className="guest-site site-shell guest-page tours-page">
      <GuestTopbar current="tours" settings={settings} tone="on-dark" />

      <div className="tours-page__stack">
        <div className="guest-page__intro tours-page__intro">
          <p className="section-note">Tours</p>
          <h1>Experiences around Chiang Mai.</h1>
          <p>
            Temples, mountains, cooking, and ethical wildlife visits we can help
            arrange while you stay. Tell us what you want when you book, or ask
            at the front desk for current operators and pickup times.
          </p>
        </div>

        <ToursCatalog propertyName={settings.propertyName} tours={tours} />

        <div className="guest-page__actions tours-page__actions">
          <Link className="button button--secondary" href="/">
            Back to home
          </Link>
          <Link className="button button--primary" href="/#booking">
            Request a stay
          </Link>
        </div>
      </div>

      <SiteFooter settings={settings} />
    </main>
  );
}
