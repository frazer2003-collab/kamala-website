import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreThaPaeSeoPage } from "./seo-onpage-score";

describe("scoreThaPaeSeoPage", () => {
  it("rewards pages aligned to hotel in Chiang Mai and Chiang Mai guesthouse", () => {
    const result = scoreThaPaeSeoPage({
      title: "Hotel in Chiang Mai — Chiang Mai Guesthouse",
      description:
        "Kamala's Boutique Guesthouse is a hotel in Chiang Mai and a Chiang Mai guesthouse near Tha Pae Gate (Tha Phae). Garden rooms, two minutes to the Old City gate.",
      h1: "A Chiang Mai guesthouse and a hotel in Chiang Mai",
      bodyText:
        "Looking for a hotel in Chiang Mai, or a Chiang Mai guesthouse near the Old City? Stay near Thae Phae Gate on Soi 6.",
      keywords: ["hotel in Chiang Mai", "Chiang Mai guesthouse"],
      canonical: "https://kamalaguesthouse.com/",
      hasOpenGraph: true,
      hasTwitterCard: true,
      hasJsonLd: true,
      hasRobotsIndex: true,
    });

    assert.ok(result.score >= 90);
  });
});
