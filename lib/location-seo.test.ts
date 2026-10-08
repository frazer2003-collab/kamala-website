import assert from "node:assert/strict";
import { describe, it } from "node:test";
import robots from "../app/robots";
import { buildHomePageJsonLd, buildLocationPageJsonLd } from "./home-seo";
import { buildLlmsFaqSection, buildLlmsLocationSection } from "./llms-text";
import type { Room } from "./content";
import type { PropertySettings } from "./property-settings";
import {
  buildThaPhaeLocationDescription,
  buildThaPhaeLocationFaq,
  GUESTHOUSE_GEO,
  THA_PHAE_LOCATION_TITLE,
  THA_PHAE_THAI_FAQ,
} from "./tha-phae-seo";

const settings = {
  propertyName: "Kamala's Boutique Guesthouse",
  addressLine: "2/7 Tha Phae Rd Soi 6, Changklan, Mueang Chiang Mai District, Chiang Mai 50100",
  contactPhone: "+66986494996",
  checkInFrom: "2:00 pm",
  checkInUntil: "11:00 pm",
  currency: "thb",
  heroImageUrl: "/hero.jpg",
} as PropertySettings;

const site = "https://www.kamalaguesthouse.com";
const rooms = [{ rate: 900 }, { rate: 1500 }] as Room[];

describe("location page SEO", () => {
  it("keeps the title and description within SERP lengths", () => {
    assert.ok(THA_PHAE_LOCATION_TITLE.length <= 60, `title ${THA_PHAE_LOCATION_TITLE.length}`);
    const description = buildThaPhaeLocationDescription(settings.propertyName);
    assert.ok(description.length <= 160, `description ${description.length}`);
    assert.match(THA_PHAE_LOCATION_TITLE, /Pet-Friendly/);
    assert.match(description, /pet-friendly/);
    assert.match(description, /Thai traditional style/);
  });

  it("answers pet and style questions in both languages and in the business schema", () => {
    const english = buildThaPhaeLocationFaq(settings).map((item) => item.question);
    assert.ok(english.includes("Is the guesthouse pet friendly?"));
    assert.ok(english.includes("What style is the guesthouse?"));
    assert.ok(THA_PHAE_THAI_FAQ.some((item) => item.answer.includes("Pet Friendly")));
    assert.ok(THA_PHAE_THAI_FAQ.some((item) => item.answer.includes("สไตล์ไทยดั้งเดิม")));

    const graphs = buildLocationPageJsonLd(settings, rooms, site) as Record<string, unknown>[];
    const lodging = graphs.find((graph) => graph["@type"] === "LodgingBusiness");
    assert.equal(lodging?.petsAllowed, true);
    assert.match(String(lodging?.description), /Thai traditional style/);
  });

  it("publishes every visible FAQ answer in the FAQPage graph", () => {
    const [faqPage] = buildLocationPageJsonLd(settings, rooms, site) as unknown as [
      { mainEntity: { name: string; acceptedAnswer: { text: string } }[] },
    ];
    const visible = [...buildThaPhaeLocationFaq(settings), ...THA_PHAE_THAI_FAQ];

    assert.deepEqual(
      faqPage.mainEntity.map((entry) => [entry.name, entry.acceptedAnswer.text]),
      visible.map((item) => [item.question, item.answer]),
    );
  });

  it("uses check-in times from settings", () => {
    const checkIn = buildThaPhaeLocationFaq(settings).find((item) =>
      item.question.includes("check-in"),
    );
    assert.match(checkIn?.answer ?? "", /2:00 pm to 11:00 pm/);
  });

  it("links the location business to the home page listing and the real pin", () => {
    const graphs = buildLocationPageJsonLd(settings, rooms, site) as Record<string, unknown>[];
    const lodging = graphs.find((graph) => graph["@type"] === "LodgingBusiness");
    const home = buildHomePageJsonLd(settings, rooms, site);

    assert.equal(lodging?.["@id"], home["@id"]);
    assert.equal(lodging?.image, home.image);
    assert.equal(lodging?.priceRange, "900-1500 THB");
    assert.deepEqual(lodging?.geo, {
      "@type": "GeoCoordinates",
      latitude: GUESTHOUSE_GEO.latitude,
      longitude: GUESTHOUSE_GEO.longitude,
    });
    assert.ok(graphs.some((graph) => graph["@type"] === "BreadcrumbList"));
  });

  it("keeps new guest-facing copy free of em-dashes", () => {
    const text = [
      ...buildThaPhaeLocationFaq(settings),
      ...THA_PHAE_THAI_FAQ,
    ].flatMap((item) => [item.question, item.answer]);
    for (const line of text) {
      assert.doesNotMatch(line, /[\u2013\u2014]/, line);
    }
  });
});

describe("llms text", () => {
  it("includes the location facts and both FAQ languages", () => {
    const location = buildLlmsLocationSection(settings, site);
    const faq = buildLlmsFaqSection(settings);

    assert.match(location, /Tha Phae Road Soi 6/);
    assert.match(location, /ประตูท่าแพ/);
    assert.match(location, new RegExp(`${GUESTHOUSE_GEO.latitude}`));
    assert.match(faq, /Can I walk to the Night Bazaar\?/);
    assert.match(faq, /ภาษาไทย/);
  });
});

describe("robots", () => {
  it("allows AI crawlers but keeps staff and API paths private for them too", () => {
    const rules = robots().rules;
    assert.ok(Array.isArray(rules));
    const ai = rules.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("GPTBot"));
    assert.ok(ai);
    assert.deepEqual(ai.disallow, ["/staff/", "/api/"]);
  });
});
