import type { PropertySettings } from "@/lib/property-settings";

export type SiteMetadataCopy = {
  defaultTitle: string;
  description: string;
  propertyName: string;
};

export function buildSiteMetadataCopy(settings: PropertySettings): SiteMetadataCopy {
  const propertyName = settings.propertyName.trim() || "Guesthouse";
  const tagline = settings.propertyTagline.trim();
  const defaultTitle = tagline ? `${propertyName} — ${tagline}` : propertyName;
  const description = tagline
    ? `Book a room at ${propertyName}. ${tagline}`
    : `Book a room at ${propertyName}. View rooms, check availability, and reserve with a deposit.`;

  return { defaultTitle, description, propertyName };
}

export function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return appUrl ? new URL(`${appUrl}/`) : undefined;
}
