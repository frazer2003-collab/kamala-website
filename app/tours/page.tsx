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
    title: `Tours · ${settings.propertyName}`,
    description: `Local tours and experiences arranged through ${settings.propertyName}.`,
  };
}

export default async function ToursPage() {
  const [settings, tours] = await Promise.all([getPropertySettings(), getPublicTours()]);

  return (
    <main className="site-shell tours-page">
      <GuestTopbar current="tours" settings={settings} />

      <div className="tours-page__intro">
        <p className="section-note">Tours</p>
        <h1>Experiences around {settings.propertyName}.</h1>
        <p>
          Day trips, walks, and boat rides we can help arrange while you stay with us.
        </p>
      </div>

      <ToursCatalog propertyName={settings.propertyName} tours={tours} />

      <div className="tours-page__actions">
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
        <Link className="button button--primary" href="/#booking">
          Request a stay
        </Link>
      </div>

      <SiteFooter settings={settings} />
    </main>
  );
}
