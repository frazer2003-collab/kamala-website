import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMapEmbedUrl, buildGoogleMapsSearchUrl } from "./google-maps";

describe("buildMapEmbedUrl", () => {
  it("builds an OpenStreetMap embed around the coordinates", () => {
    const url = buildMapEmbedUrl({ latitude: 18.787, longitude: 98.993 });

    assert.match(url, /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/);
    assert.match(url, /marker=18\.78700%2C98\.99300/);
    assert.match(url, /bbox=/);
  });
});

describe("buildGoogleMapsSearchUrl", () => {
  it("encodes the address for Google Maps search", () => {
    const url = buildGoogleMapsSearchUrl("2/7 Tha Phae Rd Soi 6, Chiang Mai");
    assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.match(url, /Tha/);
  });
});
