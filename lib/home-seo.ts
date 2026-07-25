import type { Metadata } from "next";
import type { Room } from "@/lib/content";
import {
  getGuesthouseLocationLabel,
  isChiangMaiLocation,
} from "@/lib/home-hero-copy";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";
import { getMetadataBase } from "@/lib/site-metadata";
import type { PropertySettings } from "@/lib/property-settings";
import {
  buildGoogleMapsSearchUrl,
  buildThaPhaeMetaDescription,
  isThaPhaeSeoContext,
  THA_PHAE_GATE_GEO,
  THA_PHAE_PRIMARY_TITLE,
  THA_PHAE_SEO_KEYWORDS,
  toSchemaTime,
} from "@/lib/tha-phae-seo";

function looksLikeStreetPart(part: string): boolean {
  return /^\d/.test(part) || /\b(soi|road|rd\.?|street|st\.?|lane|ave\.?)\b/i.test(part);
}

function looksLikeVenueName(part: string): boolean {
  return /\b(guest\s*house|guesthouse|boutique|hotel|resort|hostel|villa)\b/i.test(
    part,
  );
}

function parseAddressParts(addressLine: string | null) {
  if (!addressLine?.trim()) {
    return null;
  }

  const parts = addressLine.split(",").map((part) => part.trim()).filter(Boolean);
  const postalMatch = addressLine.match(/\b(\d{5})\b/);
  const streetAddress =
    parts.find((part) => looksLikeStreetPart(part) && !looksLikeVenueName(part)) ??
    parts.find((part) => looksLikeStreetPart(part)) ??
    parts.find((part) => !looksLikeVenueName(part)) ??
    parts[0] ??
    addressLine;

  return {
    streetAddress,
    addressLocality: "Chiang Mai",
    addressRegion: "Chiang Mai",
    postalCode: postalMatch?.[1] ?? "50100",
    addressCountry: "TH",
  };
}

export function buildHomePageTitle(settings: PropertySettings): string {
  const { propertyName, addressLine } = settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);

  if (isThaPhaeSeoContext(locationLabel, addressLine)) {
    return THA_PHAE_PRIMARY_TITLE;
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `${propertyName} — Guesthouse in Chiang Mai Old City`;
  }

  return `${propertyName} — Garden guesthouse in ${locationLabel}`;
}

export function buildHomePageDescription(settings: PropertySettings): string {
  const { propertyName, addressLine } = settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);

  if (isThaPhaeSeoContext(locationLabel, addressLine)) {
    return buildThaPhaeMetaDescription(propertyName);
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `Book a room at ${propertyName} in Chiang Mai Old City. Family-run guesthouse with garden rooms and included breakfast — request dates on this site and we reply to confirm.`;
  }

  return `Book a room at ${propertyName} in ${locationLabel}. Garden rooms, breakfast included — request dates on this site and staff confirm every stay.`;
}

function buildOpenGraphImageAlt(settings: PropertySettings): string {
  const locationLabel = getGuesthouseLocationLabel(
    settings.addressLine,
    settings.propertyName,
  );

  if (isThaPhaeSeoContext(locationLabel, settings.addressLine)) {
    return `${settings.propertyName} — Chiang Mai guesthouses near Tha Pae Gate`;
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `${settings.propertyName} garden guesthouse in Chiang Mai Old City`;
  }

  return `${settings.propertyName} garden guesthouse in ${locationLabel}`;
}

function buildSameAsProfiles(settings: PropertySettings) {
  return [settings.lineUrl, settings.whatsappUrl].filter(
    (url): url is string => Boolean(url?.trim()),
  );
}

export function buildHomePageMetadata(settings: PropertySettings): Metadata {
  const title = buildHomePageTitle(settings);
  const description = buildHomePageDescription(settings);
  const metadataBase = getMetadataBase();
  const heroImage = resolveHeroImageUrl(settings.heroImageUrl);
  const canonicalPath = "/";
  const nearThaPhae = isThaPhaeSeoContext(
    getGuesthouseLocationLabel(settings.addressLine, settings.propertyName),
    settings.addressLine,
  );

  const openGraphImages = heroImage
    ? [
        {
          url: heroImage.startsWith("/") && metadataBase
            ? new URL(heroImage.slice(1), metadataBase).toString()
            : heroImage,
          width: 1400,
          height: 1050,
          alt: buildOpenGraphImageAlt(settings),
        },
      ]
    : undefined;

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: nearThaPhae ? [...THA_PHAE_SEO_KEYWORDS] : undefined,
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
    other: {
      "theme-color": "#7a2f36",
    },
  };
}

function roomOfferAvailability(
  room: Room,
  availabilityByRoomId?: Record<string, number>,
): string {
  const count = availabilityByRoomId?.[room.id] ?? room.availableCount;
  return count > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/SoldOut";
}

export function buildHomePageJsonLd(
  settings: PropertySettings,
  rooms: Room[],
  appUrl: string | null,
  availabilityByRoomId?: Record<string, number>,
) {
  const { propertyName, addressLine, contactEmail, contactPhone, checkInFrom, checkInUntil } =
    settings;
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const nearThaPhae = isThaPhaeSeoContext(locationLabel, addressLine);
  const address = parseAddressParts(addressLine);
  const heroImage = resolveHeroImageUrl(settings.heroImageUrl);
  const siteUrl = appUrl?.replace(/\/$/, "") ?? undefined;
  const imageUrl =
    heroImage && siteUrl
      ? heroImage.startsWith("/")
        ? `${siteUrl}${heroImage}`
        : heroImage
      : undefined;
  const sameAs = buildSameAsProfiles(settings);

  const rates = rooms.map((room) => room.rate).filter((rate) => rate > 0);
  const minRate = rates.length > 0 ? Math.min(...rates) : null;
  const maxRate = rates.length > 0 ? Math.max(...rates) : null;

  const priceRange =
    minRate && maxRate
      ? minRate === maxRate
        ? `${minRate} THB`
        : `${minRate}-${maxRate} THB`
      : undefined;

  const description = buildHomePageDescription(settings);
  const checkInOpens = toSchemaTime(checkInFrom);
  const checkInCloses = toSchemaTime(checkInUntil);

  return {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "Organization"],
    "@id": siteUrl ? `${siteUrl}/#lodging` : undefined,
    name: propertyName,
    description,
    url: siteUrl,
    image: imageUrl,
    logo: imageUrl,
    telephone: contactPhone ?? undefined,
    email: contactEmail ?? undefined,
    priceRange,
    address: address
      ? {
          "@type": "PostalAddress",
          ...address,
        }
      : undefined,
    geo: nearThaPhae
      ? {
          "@type": "GeoCoordinates",
          latitude: THA_PHAE_GATE_GEO.latitude,
          longitude: THA_PHAE_GATE_GEO.longitude,
        }
      : undefined,
    hasMap:
      addressLine?.trim() && nearThaPhae
        ? buildGoogleMapsSearchUrl(addressLine)
        : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    openingHoursSpecification:
      checkInOpens && checkInCloses
        ? [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: checkInOpens,
              closes: checkInCloses,
            },
          ]
        : undefined,
    areaServed: {
      "@type": "City",
      name: "Chiang Mai",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Breakfast included", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Garden", value: true },
    ],
    knowsAbout: nearThaPhae
      ? [
          "Tha Pae Gate",
          "Tha Phae Gate",
          "Thapae Gate",
          "Chiang Mai Old City",
          "Sunday Walking Street",
        ]
      : isChiangMaiLocation(locationLabel)
        ? ["Chiang Mai Old City"]
        : undefined,
    makesOffer: rooms.map((room) => ({
      "@type": "Offer",
      name: room.name,
      price: room.rate,
      priceCurrency: settings.currency.toUpperCase(),
      availability: roomOfferAvailability(room, availabilityByRoomId),
      url: siteUrl ? `${siteUrl}/#rooms` : undefined,
    })),
  };
}

export function buildHomePageWebSiteJsonLd(
  settings: PropertySettings,
  appUrl: string | null,
) {
  const siteUrl = appUrl?.replace(/\/$/, "") ?? undefined;

  if (!siteUrl) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings.propertyName,
    url: siteUrl,
    description: buildHomePageDescription(settings),
    inLanguage: "en-TH",
    publisher: {
      "@id": `${siteUrl}/#lodging`,
    },
  };
}

export function buildLocationPageFaqJsonLd(propertyName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Are there Chiang Mai guesthouses near Tha Pae Gate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. ${propertyName} is a Chiang Mai guesthouse near Tha Pae Gate (also spelled Tha Phae / Thapae), about a two-minute walk from the Old City gate on Tha Phae Road Soi 6.`,
        },
      },
      {
        "@type": "Question",
        name: "How far is Kamala's Boutique Guesthouse from Tha Pae Gate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tha Pae Gate is about 100 metres away — roughly a two-minute walk from the guesthouse entrance.",
        },
      },
      {
        "@type": "Question",
        name: "Is the Sunday Walking Street close by?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. The guesthouse sits just across from the Sunday Walking Street route, so evening market walks start almost at the door.",
        },
      },
    ],
  };
}
