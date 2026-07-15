import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

const PUBLIC_PATHS = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/gallery", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/tours", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/cancellation", changeFrequency: "yearly" as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const metadataBase = getMetadataBase();
  const lastModified = new Date();

  if (!metadataBase) {
    return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
      url: path,
      lastModified,
      changeFrequency,
      priority,
    }));
  }

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, metadataBase).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
