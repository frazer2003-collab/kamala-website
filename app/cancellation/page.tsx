import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";
import { buildGuestPageMetadata } from "@/lib/site-metadata";

/** Cancellation copy changes rarely; staff settings save already revalidatePath's this route. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  return buildGuestPageMetadata({
    settings,
    path: "/cancellation",
    title: "Cancellation policy",
    description: `How cancellations and refunds work at ${settings.propertyName} for stays booked on this website.`,
  });
}

export default async function CancellationPage() {
  const settings = await getPropertySettings();

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} tone="on-dark" />

      <section className="section legal-page">
        <p className="section-note">Cancellation</p>
        <h1>Cancellation policy</h1>
        <p>{settings.cancellationPolicy}</p>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
