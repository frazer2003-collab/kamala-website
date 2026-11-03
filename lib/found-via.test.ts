import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanFoundViaDetail, foundViaLabel, parseFoundVia } from "./found-via";

describe("found via", () => {
  it("accepts only known answers", () => {
    assert.equal(parseFoundVia("ai_assistant"), "ai_assistant");
    assert.equal(parseFoundVia("billboard"), null);
    assert.equal(parseFoundVia(""), null);
  });

  it("keeps the typed question only for answers that ask for it", () => {
    assert.equal(
      cleanFoundViaDetail("ai_assistant", "  quiet guesthouse\nnear Tha Phae Gate "),
      "quiet guesthouse near Tha Phae Gate",
    );
    assert.equal(cleanFoundViaDetail("google_maps", "should be dropped"), null);
    assert.equal(cleanFoundViaDetail(null, "anything"), null);
    assert.equal(cleanFoundViaDetail("other", "   "), null);
    assert.equal(cleanFoundViaDetail("google_search", "x".repeat(400))?.length, 300);
  });

  it("labels answers for staff", () => {
    assert.equal(foundViaLabel("ai_assistant"), "ChatGPT or another AI assistant");
    assert.equal(foundViaLabel("unknown"), null);
  });
});
