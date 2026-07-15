import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const metadataBase = getMetadataBase();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff/", "/api/"],
    },
    sitemap: metadataBase ? new URL("sitemap.xml", metadataBase).toString() : undefined,
  };
}
