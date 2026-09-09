import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkContactRateLimit,
  CONTACT_RATE_LIMIT_MAX,
  resetContactRateLimitForTests,
} from "./contact-rate-limit";
import {
  CONTACT_MIN_FILL_MS,
  isContactHoneypotTripped,
  isContactSubmittedTooFast,
  isLikelyContactSpamContent,
  isLikelyRandomSpamToken,
  readContactStartedAt,
} from "./contact-spam";

describe("contact spam gates", () => {
  it("trips when the honeypot is filled", () => {
    assert.equal(isContactHoneypotTripped(""), false);
    assert.equal(isContactHoneypotTripped("   "), false);
    assert.equal(isContactHoneypotTripped("http://spam.example"), true);
  });

  it("rejects missing or too-fast timestamps", () => {
    const now = 1_000_000;
    assert.equal(readContactStartedAt("abc"), null);
    assert.equal(isContactSubmittedTooFast(null, now), true);
    assert.equal(
      isContactSubmittedTooFast(now - CONTACT_MIN_FILL_MS + 100, now),
      true,
    );
    assert.equal(
      isContactSubmittedTooFast(now - CONTACT_MIN_FILL_MS - 100, now),
      false,
    );
  });

  it("flags the random-token bot pattern from the contact spam email", () => {
    assert.equal(isLikelyRandomSpamToken("ttUmHgcYPFrMtqDljCvIzMNF"), true);
    assert.equal(isLikelyRandomSpamToken("wUyyHcjWNNAYzBTvjcNK"), true);
    assert.equal(isLikelyRandomSpamToken("Alex Guest"), false);
    assert.equal(isLikelyRandomSpamToken("Somchai"), false);
    assert.equal(
      isLikelyContactSpamContent({
        guestName: "ttUmHgcYPFrMtqDljCvIzMNF",
        message: "wUyyHcjWNNAYzBTvjcNK",
      }),
      true,
    );
  });
});

describe("contact rate limit", () => {
  it("allows a burst then blocks", () => {
    resetContactRateLimitForTests();
    const key = "test-ip";
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      assert.equal(checkContactRateLimit(key).ok, true);
    }
    const blocked = checkContactRateLimit(key);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.ok(blocked.retryAfterSec > 0);
    }
  });
});
