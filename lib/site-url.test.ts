import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getGuestChatUrl,
} from "./booking-chat";
import {
  normalizeSiteUrl,
  PRODUCTION_SITE_ORIGIN,
} from "./site-url";

describe("site URL for email conversation links", () => {
  it("rewrites apex kamalaguesthouse.com to www (apex has no DNS)", () => {
    assert.equal(
      normalizeSiteUrl("https://kamalaguesthouse.com"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(
      normalizeSiteUrl("https://kamalaguesthouse.com/"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(
      normalizeSiteUrl("http://kamalaguesthouse.com/booking/messages"),
      PRODUCTION_SITE_ORIGIN,
    );
  });

  it("leaves www and other hosts alone", () => {
    assert.equal(
      normalizeSiteUrl("https://www.kamalaguesthouse.com"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(
      normalizeSiteUrl("https://kamala-website.vercel.app"),
      "https://kamala-website.vercel.app",
    );
    assert.equal(normalizeSiteUrl("http://localhost:3000"), "http://localhost:3000");
  });

  it("builds guest chat URLs on the normalized origin", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://kamalaguesthouse.com";
    try {
      const url = getGuestChatUrl("tok-abc");
      assert.equal(
        url,
        `${PRODUCTION_SITE_ORIGIN}/booking/messages?token=tok-abc`,
      );
      assert.doesNotMatch(url, /https:\/\/kamalaguesthouse\.com\//);
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previous;
      }
    }
  });
});
