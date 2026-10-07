import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PropertySettings } from "./property-settings";
import { buildGuestPageMetadata, getMetadataBase } from "./site-metadata";
import { buildHomePageDescription } from "./home-seo";
import { buildThaPhaeLocationDescription } from "./tha-phae-seo";

const settings = {
  propertyName: "Kamala's Boutique Guesthouse",
  addressLine: "2/7 Tha Phae Rd Soi 6, Changklan, Chiang Mai 50100",
  heroImageUrl: "/hero.jpg",
} as PropertySettings;

const base = new URL("https://www.kamalaguesthouse.com/");

describe("buildGuestPageMetadata", () => {
  it("sets a canonical URL, share image and full social title", () => {
    const metadata = buildGuestPageMetadata({
      settings,
      path: "/gallery",
      title: "Gallery",
      description: "Photos.",
      metadataBase: base,
    });

    assert.equal(metadata.title, "Gallery");
    assert.deepEqual(metadata.alternates, {
      canonical: "https://www.kamalaguesthouse.com/gallery",
    });
    assert.equal(metadata.openGraph?.title, "Gallery · Kamala's Boutique Guesthouse");
    assert.equal(metadata.openGraph?.url, "https://www.kamalaguesthouse.com/gallery");
    assert.deepEqual(metadata.openGraph?.images, [
      { url: "https://www.kamalaguesthouse.com/hero.jpg", alt: "Kamala's Boutique Guesthouse" },
    ]);
  });

  it("keeps remote hero images as-is", () => {
    const metadata = buildGuestPageMetadata({
      settings: { ...settings, heroImageUrl: "https://cdn.example.com/hero.webp" },
      path: "/tours",
      title: "Tours",
      description: "Tours.",
      metadataBase: base,
    });

    assert.deepEqual(metadata.twitter?.images, ["https://cdn.example.com/hero.webp"]);
  });
});

describe("getMetadataBase", () => {
  it("rewrites the apex domain to www", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://kamalaguesthouse.com";
    try {
      assert.equal(getMetadataBase()?.origin, "https://www.kamalaguesthouse.com");
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previous;
      }
    }
  });
});

describe("location description", () => {
  it("differs from the home description", () => {
    const location = buildThaPhaeLocationDescription(settings.propertyName);
    assert.notEqual(location, buildHomePageDescription(settings));
    assert.ok(location.length <= 160, `length ${location.length}`);
  });
});
