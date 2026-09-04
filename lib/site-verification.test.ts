import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSiteVerification } from "./site-metadata";

describe("buildSiteVerification", () => {
  it("omits verification entirely when neither token is set", () => {
    assert.equal(buildSiteVerification({}), undefined);
    assert.equal(
      buildSiteVerification({
        GOOGLE_SITE_VERIFICATION: "   ",
        BING_SITE_VERIFICATION: "",
      }),
      undefined,
    );
  });

  it("emits the Google token on its own", () => {
    assert.deepEqual(
      buildSiteVerification({ GOOGLE_SITE_VERIFICATION: "abc123" }),
      { google: "abc123", other: undefined },
    );
  });

  it("emits the Bing token as msvalidate.01", () => {
    assert.deepEqual(buildSiteVerification({ BING_SITE_VERIFICATION: "DEF456" }), {
      google: undefined,
      other: { "msvalidate.01": "DEF456" },
    });
  });

  it("unwraps a whole meta tag pasted from the dashboard", () => {
    const verification = buildSiteVerification({
      GOOGLE_SITE_VERIFICATION:
        '<meta name="google-site-verification" content="abc123" />',
      BING_SITE_VERIFICATION: '<meta name="msvalidate.01" content="DEF456" />',
    });

    assert.equal(verification?.google, "abc123");
    assert.equal(verification?.other?.["msvalidate.01"], "DEF456");
  });

  it("trims surrounding whitespace on bare tokens", () => {
    assert.equal(
      buildSiteVerification({ GOOGLE_SITE_VERIFICATION: "  abc123  " })?.google,
      "abc123",
    );
  });
});
