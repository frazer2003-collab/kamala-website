import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Privacy policy" };
}

export default async function PrivacyPage() {
  const settings = await getPropertySettings();

  return (
    <main className="site-shell">
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
