import type { Metadata } from "next";
import type { Room } from "@/lib/content";
import {
  getGuesthouseLocationLabel,
  isChiangMaiLocation,
  isNearThaPhaeGate,
} from "@/lib/home-hero-copy";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";
import { getMetadataBase } from "@/lib/site-metadata";
import type { PropertySettings } from "@/lib/property-settings";

const SEO_KEYWORDS = [
  "guesthouse near Tha Phae Gate",
  "hotel near Tha Phae Gate Chiang Mai",
  "Chiang Mai Old City guesthouse",
  "boutique guesthouse Chiang Mai",
  "accommodation near Tha Phae Gate",
  "book guesthouse Chiang Mai",
  "family guesthouse Chiang Mai",
] as const;

function parseAddressParts(addressLine: string | null) {
  if (!addressLine?.trim()) {
    return null;
  }

  const parts = addressLine.split(",").map((part) => part.trim()).filter(Boolean);
  const postalMatch = addressLine.match(/\b(\d{5})\b/);

  return {
    streetAddress: parts[0] ?? addressLine,
    addressLocality: "Chiang Mai",
    addressRegion: "Chiang Mai",
    postalCode: postalMatch?.[1] ?? "50100",
    addressCountry: "TH",
  };
}

export function buildHomePageTitle(settings: PropertySettings): string {
  const { propertyName, addressLine } = settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);

  if (isChiangMaiLocation(locationLabel) && isNearThaPhaeGate(addressLine)) {
    return `${propertyName} — Guesthouse near Tha Phae Gate, Chiang Mai`;
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `${propertyName} — Guesthouse in Chiang Mai Old City`;
  }

  return `${propertyName} — Garden guesthouse in ${locationLabel}`;
}

export function buildHomePageDescription(settings: PropertySettings): string {
  const { propertyName, addressLine } = settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);

  if (isChiangMaiLocation(locationLabel) && isNearThaPhaeGate(addressLine)) {
    return `Book a room at ${propertyName}, a family-run guesthouse one minute from Tha Phae Gate in Chiang Mai Old City. Garden rooms, breakfast included — request dates here and we confirm every stay.`;
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `Book a room at ${propertyName} in Chiang Mai Old City. Family-run guesthouse with garden rooms and included breakfast — request dates on this site and we reply to confirm.`;
  }

  return `Book a room at ${propertyName} in ${locationLabel}. Garden rooms, breakfast included — request dates on this site and staff confirm every stay.`;
}

export function buildHomePageMetadata(settings: PropertySettings): Metadata {
  const title = buildHomePageTitle(settings);
  const description = buildHomePageDescription(settings);
  const metadataBase = getMetadataBase();
  const heroImage = resolveHeroImageUrl(settings.heroImageUrl);
  const canonicalPath = "/";

  const openGraphImages = heroImage
    ? [
        {
          url: heroImage.startsWith("/") && metadataBase
            ? new URL(heroImage.slice(1), metadataBase).toString()
            : heroImage,
          width: 1400,
          height: 1050,
          alt: `${settings.propertyName} courtyard and garden near Tha Phae Gate, Chiang Mai`,
        },
      ]
    : undefined;

  return {
    title,
    description,
    keywords: [...SEO_KEYWORDS],
    alternates: metadataBase
      ? {
          canonical: new URL(canonicalPath, metadataBase).toString(),
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: settings.propertyName,
      locale: "en_TH",
      url: metadataBase ? new URL(canonicalPath, metadataBase).toString() : undefined,
      images: openGraphImages,
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title,
      description,
      images: openGraphImages?.map((image) => image.url),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function buildHomePageJsonLd(
  settings: PropertySettings,
  rooms: Room[],
  appUrl: string | null,
) {
  const { propertyName, addressLine, contactEmail, contactPhone } = settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const address = parseAddressParts(addressLine);
  const heroImage = resolveHeroImageUrl(settings.heroImageUrl);
  const siteUrl = appUrl?.replace(/\/$/, "") ?? undefined;
  const imageUrl =
    heroImage && siteUrl
      ? heroImage.startsWith("/")
        ? `${siteUrl}${heroImage}`
        : heroImage
      : undefined;

  const rates = rooms.map((room) => room.rate).filter((rate) => rate > 0);
  const minRate = rates.length > 0 ? Math.min(...rates) : null;
  const maxRate = rates.length > 0 ? Math.max(...rates) : null;

  const priceRange =
    minRate && maxRate
      ? minRate === maxRate
        ? `THB ${minRate}`
        : `THB ${minRate}-${maxRate}`
      : undefined;

  const description = buildHomePageDescription(settings);

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": siteUrl ? `${siteUrl}/#lodging` : undefined,
    name: propertyName,
    description,
    url: siteUrl,
    image: imageUrl,
    telephone: contactPhone ?? undefined,
    email: contactEmail ?? undefined,
    priceRange,
    address: address
      ? {
          "@type": "PostalAddress",
          ...address,
        }
      : undefined,
    areaServed: {
      "@type": "City",
      name: locationLabel,
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Breakfast included", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Garden", value: true },
    ],
    knowsAbout: isNearThaPhaeGate(addressLine)
      ? ["Tha Phae Gate", "Chiang Mai Old City", "Sunday Walking Street"]
      : ["Chiang Mai Old City"],
    makesOffer: rooms.slice(0, 6).map((room) => ({
      "@type": "Offer",
      name: room.name,
      price: room.rate,
      priceCurrency: settings.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      url: siteUrl ? `${siteUrl}/#rooms` : undefined,
    })),
  };
}
