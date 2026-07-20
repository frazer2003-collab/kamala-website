import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPromptPayPayload, normalizePromptPayId } from "./promptpay";

describe("promptpay", () => {
  it("normalizes to digits", () => {
    assert.equal(normalizePromptPayId("081-234-5678"), "0812345678");
  });

  it("builds a payload ending with CRC tag 6304 and 4 hex chars", () => {
    const payload = buildPromptPayPayload("0812345678", 1000);
    assert.match(payload, /6304[0-9A-F]{4}$/);
    assert.ok(payload.includes("0016A000000677010112") || payload.includes("A000000677010111"));
  });

  it("embeds 13-digit national ID as-is", () => {
    const nationalId = "1234567890123";
    const payload = buildPromptPayPayload(nationalId, 500);
    assert.ok(payload.includes(`0213${nationalId}`));
    assert.ok(!payload.includes(`0066${nationalId.slice(1)}`));
  });
});
