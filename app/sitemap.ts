import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

/** Bump `lastModified` when a page's content meaningfully changes. */
const PUBLIC_PATHS = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1, lastModified: "2026-10-07" },
  { path: "/location", changeFrequency: "monthly" as const, priority: 0.9, lastModified: "2026-10-07" },
  { path: "/gallery", changeFrequency: "monthly" as const, priority: 0.8, lastModified: "2026-10-07" },
  { path: "/tours", changeFrequency: "monthly" as const, priority: 0.7, lastModified: "2026-10-07" },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.6, lastModified: "2026-10-07" },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3, lastModified: "2026-10-07" },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3, lastModified: "2026-10-07" },
  { path: "/cancellation", changeFrequency: "yearly" as const, priority: 0.3, lastModified: "2026-10-07" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const metadataBase = getMetadataBase();

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority, lastModified }) => ({
    url: metadataBase ? new URL(path, metadataBase).toString() : path,
    changeFrequency,
    priority,
    lastModified,
  }));
}
