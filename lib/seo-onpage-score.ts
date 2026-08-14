/**
 * Lightweight on-page SEO score for the Tha Pae Gate target query.
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

export const TARGET_SEO_QUERY = "chiangmai guesthouses near tha pae gate";
export const HOTEL_SEO_QUERY = "hotels in chiangmai";

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

function includesQuery(text: string, query = TARGET_SEO_QUERY) {
  const haystack = normalize(text);
  const needle = normalize(query);
  if (haystack.includes(needle)) {
    return true;
  }
  // Allow spaced Chiang Mai form after normalization collapse.
  return haystack.includes(needle.replace("chiangmai", "chiang mai"));
}

function includesHotelQuery(text: string) {
  const haystack = normalize(text);
  return (
    haystack.includes(normalize(HOTEL_SEO_QUERY)) ||
    (haystack.includes("hotel") && haystack.includes("chiangmai"))
  );
}

function includesTitleIntent(text: string) {
  return includesQuery(text) || includesHotelQuery(text);
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
    includesTitleIntent(page.title),
    18,
    "Title includes guesthouse or hotel query intent",
  );
  push(
    "description-length",
    page.description.length >= 120 && page.description.length <= 160,
    10,
    `Description length ${page.description.length} (target 120–160)`,
  );
  push(
    "description-keyword",
    includesQuery(page.description),
    14,
    "Description includes target query intent",
  );
  push("h1-present", page.h1.trim().length > 0, 6, "H1 present");
  push(
    "h1-keyword",
    includesQuery(page.h1),
    14,
    "H1 includes target query intent",
  );
  push(
    "body-keyword",
    includesQuery(page.bodyText),
    10,
    "Body copy includes target query intent",
  );
  push(
    "hotel-keyword",
    includesHotelQuery(`${page.title} ${page.description} ${page.bodyText}`),
    8,
    "Page names hotel with Chiang Mai for hotel-search intent",
  );
  push(
    "spelling-variants",
    /tha\s*pae/i.test(
      `${page.title} ${page.description} ${page.h1} ${page.bodyText} ${page.keywords.join(" ")}`,
    ) &&
      /thae\s*phae/i.test(`${page.title} ${page.description} ${page.h1} ${page.bodyText}`),
    6,
    "Uses Thae Phae Gate spelling with search-friendly Tha Pae variants",
  );
  push(
    "keywords-meta",
    page.keywords.some((keyword) => includesQuery(keyword)),
    4,
    "Keywords meta includes target query",
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
