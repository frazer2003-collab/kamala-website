import type { Metadata } from "next";
import type { PropertySettings } from "@/lib/property-settings";
import {
  buildHomePageDescription,
  buildHomePageTitle,
} from "@/lib/home-seo";
import { resolveHeroImageUrl } from "@/lib/home-hero-media";
import { normalizeSiteUrl } from "@/lib/site-url";

export type SiteMetadataCopy = {
  defaultTitle: string;
  description: string;
  propertyName: string;
};

export type SiteVerificationEnv = Record<string, string | undefined>;

/**
 * Search Console ownership tags. Google reads `google-site-verification`;
 * Bing reads `msvalidate.01`. Both accept either the bare token or the whole
 * meta tag pasted from their dashboards, so unwrap before emitting.
 */
export function buildSiteVerification(env: SiteVerificationEnv) {
  const google = readVerificationToken(env.GOOGLE_SITE_VERIFICATION);
  const bing = readVerificationToken(env.BING_SITE_VERIFICATION);

  if (!google && !bing) {
    return undefined;
  }

  return {
    google,
    other: bing ? { "msvalidate.01": bing } : undefined,
  };
}

function readVerificationToken(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const fromMetaTag = trimmed.match(/content=["']([^"']+)["']/i)?.[1]?.trim();
  return fromMetaTag || trimmed;
}

export function buildSiteMetadataCopy(settings: PropertySettings): SiteMetadataCopy {
  const propertyName = settings.propertyName.trim() || "Guesthouse";

  return {
    defaultTitle: buildHomePageTitle(settings),
    description: buildHomePageDescription(settings),
    propertyName,
  };
}

export function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return undefined;
  }
  return new URL(`${normalizeSiteUrl(appUrl)}/`);
}

type GuestPageMetadataInput = {
  settings: PropertySettings;
  path: string;
  title: string;
  description: string;
  /** Use when `title` already names the property, so the layout template doesn't repeat it. */
  absoluteTitle?: boolean;
  metadataBase?: URL;
};

/**
 * Guest page metadata with a canonical URL and share card. Page-level
 * `openGraph` replaces the layout's wholesale, so every field is restated here.
 */
export function buildGuestPageMetadata({
  settings,
  path,
  title,
  description,
  absoluteTitle = false,
  metadataBase = getMetadataBase(),
}: GuestPageMetadataInput): Metadata {
  const propertyName = settings.propertyName.trim() || "Guesthouse";
  const fullTitle = absoluteTitle ? title : `${title} · ${propertyName}`;
  const url = metadataBase ? new URL(path, metadataBase).toString() : undefined;
  const heroImage = resolveHeroImageUrl(settings.heroImageUrl);
  const imageUrl =
    heroImage && heroImage.startsWith("/")
      ? metadataBase
        ? new URL(heroImage.slice(1), metadataBase).toString()
        : undefined
      : heroImage || undefined;
  const images = imageUrl ? [{ url: imageUrl, alt: propertyName }] : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      siteName: propertyName,
      locale: "en_TH",
      url,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: images?.map((image) => image.url),
    },
  };
}
