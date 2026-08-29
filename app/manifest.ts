import type { MetadataRoute } from "next";
import { getPropertySettings } from "@/lib/property-settings";
import { buildHomePageDescription } from "@/lib/home-seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPropertySettings();

  return {
    name: settings.propertyName,
    short_name: "Kamala",
    description: buildHomePageDescription(settings),
    start_url: "/",
    display: "browser",
    background_color: "#fff8f4",
    theme_color: "#7a2f36",
    lang: "en-TH",
    icons: [
      {
        src: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/guesthouse-logo.png",
        sizes: "900x600",
        type: "image/png",
      },
    ],
  };
}
