import {
  getGuesthouseLocationLabel,
  isChiangMaiLocation,
  isCoastalLocation,
  isNearThaPhaeGate,
} from "@/lib/home-hero-copy";
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
  const nearThaPhae =
    isChiangMaiLocation(locationLabel) && isNearThaPhaeGate(settings.addressLine);

  let nearbyNote: string;
  if (isCoastalLocation(locationLabel)) {
    nearbyNote = "Beach nearby.";
  } else if (nearThaPhae) {
    nearbyNote = "Near Tha Phae Gate and Chiang Mai Old City.";
  } else if (isChiangMaiLocation(locationLabel)) {
    nearbyNote = "In Chiang Mai Old City.";
  } else {
    nearbyNote = "Quiet neighborhood.";
  }

  const defaultTitle = nearThaPhae
    ? `${propertyName} — Guesthouse near Tha Phae Gate, Chiang Mai`
    : tagline
      ? `${propertyName} — ${tagline} in ${locationLabel}`
      : `${propertyName} — Garden guesthouse in ${locationLabel}`;

  const description = nearThaPhae
    ? `Stay at ${propertyName}, a family-run guesthouse one minute from Tha Phae Gate in Chiang Mai Old City. Garden rooms. ${nearbyNote} Book direct.`
    : tagline
      ? `Stay at ${propertyName}, a local ${tagline.toLowerCase()} in ${locationLabel}. Garden rooms. ${nearbyNote} Book direct.`
      : `Stay at ${propertyName}, a local guesthouse in ${locationLabel}. Garden rooms. ${nearbyNote} Book direct.`;

  return { defaultTitle, description, propertyName };
}

export function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return appUrl ? new URL(`${appUrl}/`) : undefined;
}
