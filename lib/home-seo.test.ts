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
  it("targets hotels in Chiang Mai Old City at SERP-friendly lengths", () => {
    const title = buildHomePageTitle(thaPhaeSettings);
    const description = buildHomePageDescription(thaPhaeSettings);

    assert.equal(title, THA_PHAE_PRIMARY_TITLE);
    assert.ok(title.length >= 30 && title.length <= 60, `title length ${title.length}`);
    assert.ok(
      description.length >= 120 && description.length <= 155,
      `description length ${description.length}`,
    );
    assert.match(title, /hotels in Chiang Mai/i);
    assert.match(title, /guesthouse/i);
    assert.match(description, /hotels in Chiang Mai Old City/i);
    assert.match(description, /guesthouse/i);
  });

  it("uses a host-voiced H1 and a natural hero lede that still names hotels in Chiang Mai Old City", () => {
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
    assert.match(h1, /garden guesthouse in Chiang Mai Old City/i);
    assert.doesNotMatch(h1, /^hotels in/i);
    assert.match(lede, /hotels in Chiang Mai Old City/i);
    assert.match(lede, /guesthouse/i);
    assert.match(lede, /Thae Phae Gate a two-minute walk/i);
  });

  it("scores highly against hotels in Chiang Mai", () => {
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
    assert.ok(jsonLd.knowsAbout?.includes("Hotels in Chiang Mai"));
    assert.ok(jsonLd.knowsAbout?.includes("Chiang Mai guesthouse"));
    assert.deepEqual(jsonLd.alternateName, [
      "Chiang Mai guesthouse",
      "Hotels in Chiang Mai Old City",
    ]);
    assert.ok(Array.isArray(jsonLd["@type"]));
    assert.ok(jsonLd["@type"]?.includes("Hotel"));
    assert.deepEqual(jsonLd.sameAs, [
      "https://line.me/R/ti/p/@example",
      "https://wa.me/66986494996",
    ]);
  });
});
