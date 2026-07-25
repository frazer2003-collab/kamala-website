#!/usr/bin/env node
/**
 * Local on-page SEO check for the Tha Pae Gate target query.
 * Run: node --import tsx scripts/check-tha-pae-seo.mjs
 */
import {
  buildHomePageDescription,
  buildHomePageTitle,
} from "../lib/home-seo.ts";
import { buildAtmosphereHeadline, buildAtmosphereLede, buildStayStoryLede } from "../lib/home-hero-copy.ts";
import { scoreThaPaeSeoPage, TARGET_SEO_QUERY } from "../lib/seo-onpage-score.ts";
import { THA_PHAE_SEO_KEYWORDS } from "../lib/tha-phae-seo.ts";

const settings = {
  propertyName: "Kamala's Boutique Guesthouse",
  propertyTagline: "Chiang Mai City Center",
  addressLine:
    "Kamala's Boutique Guest house, 2/7 Tha Phae Rd Soi 6, Changklan, Mueang Chiang Mai District, Chiang Mai 50100",
};

const title = buildHomePageTitle(settings);
const description = buildHomePageDescription(settings);
const h1 = buildAtmosphereHeadline("Chiang Mai", settings.propertyName, settings.addressLine);
const bodyText = [
  buildAtmosphereLede("Chiang Mai", settings.propertyTagline, settings.addressLine),
  buildStayStoryLede(settings.propertyName, "Chiang Mai", settings.addressLine),
].join(" ");

const result = scoreThaPaeSeoPage({
  title,
  description,
  h1,
  bodyText,
  keywords: [...THA_PHAE_SEO_KEYWORDS],
  canonical: "https://kamalaguesthouse.com/",
  hasOpenGraph: true,
  hasTwitterCard: true,
  hasJsonLd: true,
  hasRobotsIndex: true,
});

console.log(`Target query: ${TARGET_SEO_QUERY}`);
console.log(`Title (${title.length}): ${title}`);
console.log(`Description (${description.length}): ${description}`);
console.log(`H1: ${h1}`);
console.log(`Score: ${result.score}/100 (${result.grade})`);
for (const check of result.checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.id} — ${check.detail}`);
}

if (result.score < 90) {
  process.exit(1);
}
