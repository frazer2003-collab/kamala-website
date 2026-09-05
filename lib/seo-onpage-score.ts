/**
 * On-page SEO score for lodging queries with real search interest
 * (Google autocomplete / average Trends), not stuffed variants.
 *
 * Primary cluster: Chiang Mai guesthouse / guest house (winnable).
 * Hotels queries are secondary — OTAs own the head term.
 */

export type SeoPageSnapshot = {
  title: string;
  description: string;
  h1: string;
  bodyText: string;
  keywords: string[];
  canonical?: string | null;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasJsonLd: boolean;
  hasRobotsIndex: boolean;
};

/** Highest-interest winnable lodging query for this property. */
export const GUESTHOUSE_SEO_QUERY = "chiang mai guesthouse";
/** Spaced form from Google autocomplete. */
export const GUEST_HOUSE_SEO_QUERY = "chiang mai guest house";
/** Related guesthouse query. */
export const GUESTHOUSE_CHIANG_MAI_QUERY = "guesthouse chiang mai";
/** Secondary head term — OTAs dominate; keep light coverage only. */
export const HOTEL_SEO_QUERY = "hotels in chiang mai";
/** @deprecated Use GUESTHOUSE_SEO_QUERY. */
export const TARGET_SEO_QUERY = GUESTHOUSE_SEO_QUERY;

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/thae\s*phae/g, "tha pae")
    .replace(/tha\s*phae/g, "tha pae")
    .replace(/thapae/g, "tha pae")
    .replace(/guest\s+house/g, "guesthouse")
    .replace(/chiang\s*mai/g, "chiangmai")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(text: string, query: string) {
  return normalize(text).includes(normalize(query));
}

function includesChiangMaiGuesthouse(text: string) {
  return (
    includesNormalized(text, GUESTHOUSE_SEO_QUERY) ||
    includesNormalized(text, GUEST_HOUSE_SEO_QUERY) ||
    includesNormalized(text, GUESTHOUSE_CHIANG_MAI_QUERY) ||
    (includesNormalized(text, "guesthouse") &&
      includesNormalized(text, "chiang mai"))
  );
}

export type SeoScoreResult = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: Array<{ id: string; passed: boolean; weight: number; detail: string }>;
};

export function scoreThaPaeSeoPage(page: SeoPageSnapshot): SeoScoreResult {
  const checks: SeoScoreResult["checks"] = [];

  const push = (id: string, passed: boolean, weight: number, detail: string) => {
    checks.push({ id, passed, weight, detail });
  };

  const combined = `${page.title} ${page.description} ${page.h1} ${page.bodyText}`;

  push(
    "title-length",
    page.title.length >= 30 && page.title.length <= 60,
    10,
    `Title length ${page.title.length} (target 30–60)`,
  );
  push(
    "title-keyword",
    includesChiangMaiGuesthouse(page.title),
    20,
    "Title includes Chiang Mai guesthouse / guest house",
  );
  push(
    "description-length",
    page.description.length >= 120 && page.description.length <= 160,
    10,
    `Description length ${page.description.length} (target 120–160)`,
  );
  push(
    "description-keyword",
    includesChiangMaiGuesthouse(page.description),
    12,
    "Description includes Chiang Mai guesthouse / guest house",
  );
  push("h1-present", page.h1.trim().length > 0, 6, "H1 present");
  push(
    "h1-keyword",
    /guesthouse/i.test(page.h1) &&
      /chiang\s*mai/i.test(page.h1) &&
      /old city/i.test(page.h1),
    16,
    "H1 names a guesthouse in Chiang Mai Old City",
  );
  push(
    "body-guesthouse",
    includesChiangMaiGuesthouse(combined),
    10,
    "Page names a Chiang Mai guesthouse",
  );
  push(
    "old-city",
    /old city/i.test(combined),
    6,
    "Page names Old City",
  );
  push(
    "spelling-variants",
    /tha\s*pae/i.test(`${combined} ${page.keywords.join(" ")}`) &&
      /thae\s*phae/i.test(combined),
    4,
    "Uses Thae Phae Gate spelling with search-friendly Tha Pae variants",
  );
  push(
    "keywords-meta",
    page.keywords.some((keyword) => includesChiangMaiGuesthouse(keyword)),
    4,
    "Keywords meta includes Chiang Mai guesthouse",
  );
  push("canonical", Boolean(page.canonical), 2, "Canonical URL present");
  push("open-graph", page.hasOpenGraph, 2, "Open Graph tags present");
  push("twitter", page.hasTwitterCard, 2, "Twitter card present");
  push("json-ld", page.hasJsonLd, 2, "JSON-LD present");
  push("robots-index", page.hasRobotsIndex, 2, "Robots allow indexing");

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce(
    (sum, check) => sum + (check.passed ? check.weight : 0),
    0,
  );
  const score = Math.round((earned / totalWeight) * 100);
  const grade =
    score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return { score, grade, checks };
}
