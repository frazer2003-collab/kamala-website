import { getGuesthouseLocationLabel, isCoastalLocation } from "@/lib/home-hero-copy";
import type { PropertySettings } from "@/lib/property-settings";

export type SiteMetadataCopy = {
  defaultTitle: string;
  description: string;
  propertyName: string;
};

export function buildSiteMetadataCopy(settings: PropertySettings): SiteMetadataCopy {
  const propertyName = settings.propertyName.trim() || "Guesthouse";
  const tagline = settings.propertyTagline.trim();
  const locationLabel = getGuesthouseLocationLabel(settings.addressLine, propertyName);
  const nearbyNote = isCoastalLocation(locationLabel) ? "Beach nearby." : "Quiet neighborhood.";
  const defaultTitle = tagline
    ? `${propertyName} — ${tagline} in ${locationLabel}`
    : `${propertyName} — Garden guesthouse in ${locationLabel}`;
  const description = tagline
    ? `Stay at ${propertyName}, a local ${tagline.toLowerCase()} in ${locationLabel}. Garden rooms. ${nearbyNote} Book direct.`
    : `Stay at ${propertyName}, a local guesthouse in ${locationLabel}. Garden rooms. ${nearbyNote} Book direct.`;

  return { defaultTitle, description, propertyName };
}

export function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return appUrl ? new URL(`${appUrl}/`) : undefined;
}
