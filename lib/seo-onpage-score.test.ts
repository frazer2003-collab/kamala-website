import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreThaPaeSeoPage } from "./seo-onpage-score";

describe("scoreThaPaeSeoPage", () => {
  it("rewards pages aligned to the target query", () => {
    const result = scoreThaPaeSeoPage({
      title: "Chiang Mai Hotel & Guesthouse Near Tha Pae Gate",
      description:
        "Kamala's Boutique Guesthouse: a small hotel among Chiang Mai guesthouses near Tha Pae Gate (Tha Phae). Two-minute walk to the Old City gate.",
      h1: "Chiang Mai guesthouses near Tha Pae Gate",
      bodyText:
        "Looking for hotels in Chiang Mai, or Chiang Mai guesthouses near Tha Pae Gate? Stay near Tha Phae Gate on Soi 6.",
      keywords: ["chiangmai guesthouses near tha pae gate"],
      canonical: "https://kamalaguesthouse.com/",
      hasOpenGraph: true,
      hasTwitterCard: true,
      hasJsonLd: true,
      hasRobotsIndex: true,
    });

    assert.ok(result.score >= 90);
  });
});
