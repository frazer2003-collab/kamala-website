import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreThaPaeSeoPage } from "./seo-onpage-score";

describe("scoreThaPaeSeoPage", () => {
  it("rewards pages aligned to Chiang Mai guesthouse queries", () => {
    const result = scoreThaPaeSeoPage({
      title: "Chiang Mai Guesthouse near Thae Phae Gate",
      description:
        "Kamala's Boutique Guesthouse: a Chiang Mai guesthouse in the Old City — garden rooms with breakfast, two minutes from Thae Phae Gate. Book direct.",
      h1: "A garden guesthouse in Chiang Mai Old City",
      bodyText:
        "A family-run Chiang Mai guest house near Thae Phae Gate — one of the quieter guesthouses in Chiang Mai Old City.",
      keywords: ["Chiang Mai guesthouse", "guesthouse Chiang Mai", "Chiang Mai guest house"],
      canonical: "https://kamalaguesthouse.com/",
      hasOpenGraph: true,
      hasTwitterCard: true,
      hasJsonLd: true,
      hasRobotsIndex: true,
    });

    assert.ok(result.score >= 90);
  });
});
