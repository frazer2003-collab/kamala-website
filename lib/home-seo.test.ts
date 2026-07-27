import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHomePageDescription,
  buildHomePageJsonLd,
  buildHomePageTitle,
} from "./home-seo";
import { buildAtmosphereHeadline, buildAtmosphereLede } from "./home-hero-copy";
import { scoreThaPaeSeoPage } from "./seo-onpage-score";
import {
  THA_PHAE_PRIMARY_HEADLINE,
  THA_PHAE_PRIMARY_TITLE,
  THA_PHAE_SEO_KEYWORDS,
  buildThaPhaeHeroLede,
  buildThaPhaeStayStoryLede,
} from "./tha-phae-seo";
import type { PropertySettings } from "./property-settings";

const thaPhaeSettings = {
  propertyName: "Kamala's Boutique Guesthouse",
  propertyTagline: "Chiang Mai City Center",
  addressLine:
    "Kamala's Boutique Guest house, 2/7 Tha Phae Rd Soi 6, Changklan, Mueang Chiang Mai District, Chiang Mai 50100",
  contactEmail: "host@example.com",
  contactPhone: "+66986494996",
  checkInFrom: "2:00 pm",
  checkInUntil: "11:00 pm",
  currency: "thb",
  heroImageUrl: "/hero.jpg",
  lineUrl: "https://line.me/R/ti/p/@example",
  whatsappUrl: "https://wa.me/66986494996",
} as PropertySettings;

describe("Tha Pae Gate SEO copy", () => {
  it("keeps title and description in SERP-friendly lengths with the target query", () => {
    const title = buildHomePageTitle(thaPhaeSettings);
    const description = buildHomePageDescription(thaPhaeSettings);

    assert.equal(title, THA_PHAE_PRIMARY_TITLE);
    assert.ok(title.length >= 30 && title.length <= 60, `title length ${title.length}`);
    assert.ok(
      description.length >= 120 && description.length <= 155,
      `description length ${description.length}`,
    );
    assert.match(description, /Thae Phae Gate/i);
  });

  it("uses Thae Phae Gate in H1 and hero copy", () => {
    const h1 = buildAtmosphereHeadline(
      "Chiang Mai",
      thaPhaeSettings.propertyName,
      thaPhaeSettings.addressLine,
    );
    const lede = buildAtmosphereLede(
      "Chiang Mai",
      thaPhaeSettings.propertyTagline,
      thaPhaeSettings.addressLine,
    );

    assert.equal(h1, THA_PHAE_PRIMARY_HEADLINE);
    assert.match(lede, /Chiang Mai guesthouses near Thae Phae Gate/i);
    assert.match(lede, /Thae Phae Gate a two-minute walk/i);
  });

  it("scores highly against the target Chiang Mai / Tha Pae query", () => {
    const title = buildHomePageTitle(thaPhaeSettings);
    const description = buildHomePageDescription(thaPhaeSettings);
    const h1 = THA_PHAE_PRIMARY_HEADLINE;
    const body = [
      buildThaPhaeHeroLede(),
      buildThaPhaeStayStoryLede(thaPhaeSettings.propertyName),
    ].join(" ");

    const result = scoreThaPaeSeoPage({
      title,
      description,
      h1,
      bodyText: body,
      keywords: [...THA_PHAE_SEO_KEYWORDS],
      canonical: "https://kamalaguesthouse.com/",
      hasOpenGraph: true,
      hasTwitterCard: true,
      hasJsonLd: true,
      hasRobotsIndex: true,
    });

    assert.ok(result.score >= 90, `expected score >= 90, got ${result.score} (${result.grade})`);
    assert.equal(result.grade, "A");
  });

  it("parses a real street address for LodgingBusiness schema", () => {
    const jsonLd = buildHomePageJsonLd(thaPhaeSettings, [], "https://kamalaguesthouse.com");
    assert.equal(jsonLd.address?.streetAddress, "2/7 Tha Phae Rd Soi 6");
    assert.ok(Array.isArray(jsonLd.knowsAbout));
    assert.ok(jsonLd.knowsAbout?.includes("Thae Phae Gate"));
    assert.deepEqual(jsonLd.sameAs, [
      "https://line.me/R/ti/p/@example",
      "https://wa.me/66986494996",
    ]);
  });
});
