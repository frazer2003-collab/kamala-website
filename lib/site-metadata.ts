import type { PropertySettings } from "@/lib/property-settings";
import {
  buildHomePageDescription,
  buildHomePageTitle,
} from "@/lib/home-seo";

export type SiteMetadataCopy = {
  defaultTitle: string;
  description: string;
  propertyName: string;
};

export function buildSiteMetadataCopy(settings: PropertySettings): SiteMetadataCopy {
  const propertyName = settings.propertyName.trim() || "Guesthouse";

  return {
    defaultTitle: buildHomePageTitle(settings),
    description: buildHomePageDescription(settings),
    propertyName,
  };
}

export function getMetadataBase() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return appUrl ? new URL(`${appUrl}/`) : undefined;
}
