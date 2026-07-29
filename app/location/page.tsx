import type { Metadata } from "next";
import { GuestPageClosingActions } from "@/components/guest-page-closing-actions";
import { GuestTopbar } from "@/components/guest-topbar";
import { PropertyLocation } from "@/components/property-location";
import { SiteFooter } from "@/components/site-footer";
import {
  buildHomePageDescription,
  buildLocationPageFaqJsonLd,
} from "@/lib/home-seo";
import { getMetadataBase } from "@/lib/site-metadata";
import { getPropertySettings } from "@/lib/property-settings";
import {
  buildThaPhaeMetaDescription,
  isThaPhaeSeoContext,
  THA_PHAE_GATE_GEO,
  THA_PHAE_PRIMARY_TITLE,
} from "@/lib/tha-phae-seo";
import { getGuesthouseLocationLabel } from "@/lib/home-hero-copy";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  const locationLabel = getGuesthouseLocationLabel(
    settings.addressLine,
    settings.propertyName,
  );
  const nearThaPhae = isThaPhaeSeoContext(locationLabel, settings.addressLine);
  const title = nearThaPhae
    ? "Location Near Tha Pae Gate, Chiang Mai"
    : `Location · ${settings.propertyName}`;
  const description = nearThaPhae
    ? buildThaPhaeMetaDescription(settings.propertyName)
    : buildHomePageDescription(settings);
  const metadataBase = getMetadataBase();

  return {
    title,
    description,
    alternates: metadataBase
      ? { canonical: new URL("/location", metadataBase).toString() }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: settings.propertyName,
      url: metadataBase ? new URL("/location", metadataBase).toString() : undefined,
    },
  };
}

export default async function LocationPage() {
  const settings = await getPropertySettings();
  const locationLabel = getGuesthouseLocationLabel(
    settings.addressLine,
    settings.propertyName,
  );
  const nearThaPhae = isThaPhaeSeoContext(locationLabel, settings.addressLine);
  const faqJsonLd = nearThaPhae
    ? buildLocationPageFaqJsonLd(settings.propertyName)
    : null;

  return (
    <main className="guest-site site-shell guest-page location-page">
      {faqJsonLd ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          type="application/ld+json"
        />
      ) : null}
      <GuestTopbar current="location" settings={settings} tone="on-dark" />

      <div className="guest-page__intro location-page__intro">
        <p className="section-note">Location</p>
        <h1>
          {nearThaPhae
            ? THA_PHAE_PRIMARY_TITLE
            : `Find ${settings.propertyName}`}
        </h1>
        <p>
          {nearThaPhae
            ? "Looking for Chiang Mai guesthouses near Tha Pae Gate? We are on Tha Phae Road Soi 6 in Changklan — a two-minute walk to Tha Pae Gate (also spelled Tha Phae / Thapae), just across from the Sunday Walking Street."
            : `Visit ${settings.propertyName} in ${locationLabel}.`}
        </p>
      </div>

      <section className="location-page__details" aria-labelledby="location-details-title">
        <h2 id="location-details-title">How to find us</h2>
        <PropertyLocation
          addressLine={settings.addressLine}
          contactPhone={settings.contactPhone}
          coordinates={nearThaPhae ? THA_PHAE_GATE_GEO : null}
          showMap
        />
        {nearThaPhae ? (
          <ul className="location-page__facts">
            <li>
              <strong>Tha Pae Gate:</strong> about 100 metres / two minutes on foot
            </li>
            <li>
              <strong>Sunday Walking Street:</strong> across the street from the
              guesthouse
            </li>
            <li>
              <strong>Nawarat Bridge night market:</strong> about six minutes away
            </li>
            <li>
              <strong>Nearby:</strong> 7-Eleven, ATMs, Boots, cafés, and restaurants
            </li>
          </ul>
        ) : null}
      </section>

      {nearThaPhae ? (
        <section className="location-page__faq" aria-labelledby="location-faq-title">
          <h2 id="location-faq-title">Common questions</h2>
          <dl className="location-page__faq-list">
            <div>
              <dt>Are there Chiang Mai guesthouses near Tha Pae Gate?</dt>
              <dd>
                Yes. {settings.propertyName} is a Chiang Mai guesthouse near Tha Pae
                Gate, about a two-minute walk from the Old City gate.
              </dd>
            </div>
            <div>
              <dt>How do I spell Tha Pae Gate?</dt>
              <dd>
                You will see Tha Pae, Tha Phae, and Thapae in maps and guides — they
                refer to the same east gate of Chiang Mai Old City.
              </dd>
            </div>
            <div>
              <dt>Can I book a room directly?</dt>
              <dd>
                Yes. Choose dates on the homepage, pick a room, and reserve here —
                we reply to confirm your stay.
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      <GuestPageClosingActions />

      <SiteFooter settings={settings} />
    </main>
  );
}
