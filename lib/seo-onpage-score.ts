/**
 * On-page SEO score for lodging queries with real search interest
 * (Google autocomplete / average Trends), not stuffed variants.
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

/** Highest-interest lodging query for this city (Google “hotels in [city]”). */
export const HOTEL_SEO_QUERY = "hotels in chiang mai";
/** Related query with steady interest. */
export const GUESTHOUSE_SEO_QUERY = "chiang mai guesthouse";
/** @deprecated Use HOTEL_SEO_QUERY. */
export const TARGET_SEO_QUERY = HOTEL_SEO_QUERY;

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/thae\s*phae/g, "tha pae")
    .replace(/tha\s*phae/g, "tha pae")
    .replace(/thapae/g, "tha pae")
    .replace(/chiang\s*mai/g, "chiangmai")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(text: string, query: string) {
  return normalize(text).includes(normalize(query));
}

function includesHotelsInChiangMai(text: string) {
  return includesNormalized(text, HOTEL_SEO_QUERY);
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
    includesHotelsInChiangMai(page.title),
    20,
    "Title includes “hotels in Chiang Mai”",
  );
  push(
    "description-length",
    page.description.length >= 120 && page.description.length <= 160,
    10,
    `Description length ${page.description.length} (target 120–160)`,
  );
  push(
    "description-keyword",
    includesHotelsInChiangMai(page.description),
    12,
    "Description includes “hotels in Chiang Mai”",
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
    includesNormalized(combined, GUESTHOUSE_SEO_QUERY) ||
      (includesNormalized(combined, "guesthouse") &&
        includesNormalized(combined, "chiang mai")),
    10,
    "Page names a Chiang Mai guesthouse",
  );
  push(
    "old-city",
    /old city/i.test(combined),
    6,
    "Page names Old City (hotels in Chiang Mai old city)",
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
    page.keywords.some((keyword) => includesHotelsInChiangMai(keyword)),
    4,
    "Keywords meta includes “hotels in Chiang Mai”",
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
