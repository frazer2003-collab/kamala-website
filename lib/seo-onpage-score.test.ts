import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreThaPaeSeoPage } from "./seo-onpage-score";

describe("scoreThaPaeSeoPage", () => {
  it("rewards pages aligned to hotels in Chiang Mai", () => {
    const result = scoreThaPaeSeoPage({
      title: "Hotels in Chiang Mai Old City — Guesthouse",
      description:
        "Kamala's Boutique Guesthouse: hotels in Chiang Mai Old City — a garden guesthouse with breakfast. Two-minute walk to the Old City gate near Tha Pae (Thae Phae).",
      h1: "A garden guesthouse in Chiang Mai Old City",
      bodyText:
        "Among hotels in Chiang Mai Old City, we are a Chiang Mai guesthouse near Thae Phae Gate.",
      keywords: ["hotels in Chiang Mai", "Chiang Mai guesthouse"],
      canonical: "https://kamalaguesthouse.com/",
      hasOpenGraph: true,
      hasTwitterCard: true,
      hasJsonLd: true,
      hasRobotsIndex: true,
    });

    assert.ok(result.score >= 90);
  });
});
