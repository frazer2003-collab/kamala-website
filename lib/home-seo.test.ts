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
  it("targets Chiang Mai guesthouse queries at SERP-friendly lengths", () => {
    const title = buildHomePageTitle(thaPhaeSettings);
    const description = buildHomePageDescription(thaPhaeSettings);

    assert.equal(title, THA_PHAE_PRIMARY_TITLE);
    assert.ok(title.length >= 30 && title.length <= 60, `title length ${title.length}`);
    assert.ok(
      description.length >= 120 && description.length <= 160,
      `description length ${description.length}`,
    );
    assert.match(title, /Chiang Mai Guesthouse/i);
    assert.match(title, /Thae Phae Gate/i);
    assert.match(description, /Chiang Mai guesthouse/i);
    assert.match(description, /Book direct/i);
  });

  it("uses a host-voiced H1 and a natural hero lede that names a Chiang Mai guesthouse", () => {
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
    assert.match(lede, /Chiang Mai guesthouse/i);
    assert.match(lede, /in front of Thae Phae Gate/i);
    assert.doesNotMatch(lede, /breakfast/i);
  });

  it("scores highly against Chiang Mai guesthouse queries", () => {
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
    assert.ok(jsonLd.knowsAbout?.includes("Chiang Mai guesthouse"));
    assert.ok(jsonLd.knowsAbout?.includes("Chiang Mai guest house"));
    assert.ok(jsonLd.knowsAbout?.includes("guesthouses in Chiang Mai"));
    assert.deepEqual(jsonLd.alternateName, [
      "Chiang Mai guesthouse",
      "Chiang Mai guest house",
      "Guesthouse Chiang Mai",
    ]);
    assert.ok(Array.isArray(jsonLd["@type"]));
    assert.ok(jsonLd["@type"]?.includes("GuestHouse"));
    assert.ok(jsonLd["@type"]?.includes("Hotel"));
    assert.deepEqual(jsonLd.sameAs, [
      "https://line.me/R/ti/p/@example",
      "https://wa.me/66986494996",
    ]);
  });
});
