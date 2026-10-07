import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/site-metadata";

/** AI search and answer crawlers we want quoting the guest pages. */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
];

const PRIVATE_PATHS = ["/staff/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  const metadataBase = getMetadataBase();

  return {
    // A crawler with its own group ignores the `*` group, so each repeats the disallows.
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: metadataBase ? new URL("sitemap.xml", metadataBase).toString() : undefined,
  };
}
