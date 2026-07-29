/**
 * THESIS: A quiet contact desk — write the house by email first; chat and call
 * wait beside the form. Refuses icon-tile channel grids and booking-form chrome.
 * OWN-WORLD: Guest-page shell, maroon Send, muted side rail; Trusted Counter.
 * STORY: Guest sends a short note (or opens LINE / WhatsApp / phone) and trusts
 * a reply will come.
 * FIRST VIEWPORT: Intro → form (~2/3) + Reach us also (~1/3); mobile stacks form first.
 * FORM: Operate desk — shaped contact brief; polish-before-build contract.
 */
import type { Metadata } from "next";
import { ContactChannels } from "@/components/contact-channels";
import { ContactForm } from "@/components/contact-form";
import { GuestPageClosingActions } from "@/components/guest-page-closing-actions";
import { GuestTopbar } from "@/components/guest-topbar";
import { SiteFooter } from "@/components/site-footer";
import { getPropertySettings } from "@/lib/property-settings";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  const title = `Contact · ${settings.propertyName}`;
  const description = `Message ${settings.propertyName} by email, or reach us on LINE, WhatsApp, or telephone.`;
  return {
    title,
    description,
  };
}

export default async function ContactPage() {
  const settings = await getPropertySettings();
  const canEmail = Boolean(settings.contactEmail?.trim());

  return (
    <main className="guest-site site-shell guest-page contact-page">
      <GuestTopbar current="contact" settings={settings} tone="on-dark" />

      <div className="guest-page__intro contact-page__intro">
        <p className="section-note">Contact</p>
        <h1>Ask the house</h1>
        <p>
          Send a short message and we’ll reply by email. Prefer chat or a call?
          Use the channels beside the form.
        </p>
      </div>

      <div className="contact-page__desk">
        <section
          aria-labelledby="contact-form-title"
          className="contact-page__form-panel"
        >
          <h2 className="sr-only" id="contact-form-title">
            Email message
          </h2>
          <ContactForm canEmail={canEmail} propertyName={settings.propertyName} />
        </section>
        <ContactChannels settings={settings} />
      </div>

      <GuestPageClosingActions />

      <SiteFooter settings={settings} />
    </main>
  );
}
