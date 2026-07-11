import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Cancellation policy" };
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
