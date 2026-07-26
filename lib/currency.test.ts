import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMoneyAmount } from "./currency";

describe("parseMoneyAmount", () => {
  it("accepts zero and decimal zero", () => {
    assert.equal(parseMoneyAmount("0"), 0);
    assert.equal(parseMoneyAmount("0.00"), 0);
    assert.equal(parseMoneyAmount(" 0 "), 0);
  });

  it("rounds decimal currency amounts to whole units", () => {
    assert.equal(parseMoneyAmount("12.50"), 13);
    assert.equal(parseMoneyAmount("12.4"), 12);
    assert.equal(parseMoneyAmount("700"), 700);
  });

  it("rejects empty, negative, and non-numeric values", () => {
    assert.equal(parseMoneyAmount(""), null);
    assert.equal(parseMoneyAmount("   "), null);
    assert.equal(parseMoneyAmount("-1"), null);
    assert.equal(parseMoneyAmount("abc"), null);
  });
});
