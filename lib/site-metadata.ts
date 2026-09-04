import type { PropertySettings } from "@/lib/property-settings";
import {
  buildHomePageDescription,
  buildHomePageTitle,
} from "@/lib/home-seo";
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
