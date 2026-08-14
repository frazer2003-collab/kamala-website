/**
 * Lightweight on-page SEO score for the two homepage target queries.
 * Used in tests and local iteration; complements external checkers.
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

export const GUESTHOUSE_SEO_QUERY = "chiangmai guesthouse";
export const HOTEL_SEO_QUERY = "hotel in chiangmai";
/** @deprecated Use GUESTHOUSE_SEO_QUERY — kept so older test names still read. */
export const TARGET_SEO_QUERY = GUESTHOUSE_SEO_QUERY;

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

function includesGuesthouseQuery(text: string) {
  return includesNormalized(text, GUESTHOUSE_SEO_QUERY);
}

function includesHotelQuery(text: string) {
  return includesNormalized(text, HOTEL_SEO_QUERY);
}

function includesBothQueries(text: string) {
  return includesGuesthouseQuery(text) && includesHotelQuery(text);
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

  push(
    "title-length",
    page.title.length >= 30 && page.title.length <= 60,
    10,
    `Title length ${page.title.length} (target 30–60)`,
  );
  push(
    "title-keyword",
    includesBothQueries(page.title),
    20,
    "Title includes “hotel in Chiang Mai” and “Chiang Mai guesthouse”",
  );
  push(
    "description-length",
    page.description.length >= 120 && page.description.length <= 160,
    10,
    `Description length ${page.description.length} (target 120–160)`,
  );
  push(
    "description-keyword",
    includesBothQueries(page.description),
    14,
    "Description includes both target queries",
  );
  push("h1-present", page.h1.trim().length > 0, 6, "H1 present");
  push(
    "h1-keyword",
    includesBothQueries(page.h1),
    16,
    "H1 includes both target queries",
  );
  push(
    "body-keyword",
    includesBothQueries(page.bodyText),
    12,
    "Body copy includes both target queries",
  );
  push(
    "spelling-variants",
    /tha\s*pae/i.test(
      `${page.title} ${page.description} ${page.h1} ${page.bodyText} ${page.keywords.join(" ")}`,
    ) &&
      /thae\s*phae/i.test(`${page.title} ${page.description} ${page.h1} ${page.bodyText}`),
    4,
    "Uses Thae Phae Gate spelling with search-friendly Tha Pae variants",
  );
  push(
    "keywords-meta",
    page.keywords.some((keyword) => includesBothQueries(keyword)) ||
      (page.keywords.some((keyword) => includesHotelQuery(keyword)) &&
        page.keywords.some((keyword) => includesGuesthouseQuery(keyword))),
    4,
    "Keywords meta includes both target queries",
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
