import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatStayEndReason,
  isStayEndReason,
  parseStayEndReason,
} from "./stay-end-reason";

describe("stay-end-reason", () => {
  it("parses known reasons", () => {
    assert.equal(parseStayEndReason("cancellation"), "cancellation");
    assert.equal(parseStayEndReason("no-show"), "no-show");
    assert.equal(parseStayEndReason("invalid"), null);
    assert.equal(parseStayEndReason(null), null);
  });

  it("formats labels for staff display", () => {
    assert.equal(formatStayEndReason("cancellation"), "Cancellation");
    assert.equal(formatStayEndReason("no-show"), "No-show");
    assert.equal(formatStayEndReason(null), null);
  });

  it("type guards values", () => {
    assert.equal(isStayEndReason("no-show"), true);
    assert.equal(isStayEndReason("cancelled"), false);
  });
});
