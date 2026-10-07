import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";
import { buildGuestPageMetadata } from "@/lib/site-metadata";

/** Policy text is edited rarely; staff settings save already revalidatePath's this route. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  return buildGuestPageMetadata({
    settings,
    path: "/privacy",
    title: "Privacy policy",
    description: `How ${settings.propertyName} uses the contact details you share when you book or message us.`,
  });
}

export default async function PrivacyPage() {
  const settings = await getPropertySettings();

  return (
    <main className="guest-site site-shell">
      <GuestTopbar settings={settings} tone="on-dark" />

      <section className="section legal-page">
        <p className="section-note">Privacy</p>
        <h1>Privacy policy</h1>
        <p>{settings.privacyPolicy}</p>
        <p>
          Contact: {settings.contactEmail ?? "use the email on your booking confirmation"}
        </p>
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
      </section>
      <SiteFooter settings={settings} />
    </main>
  );
}
