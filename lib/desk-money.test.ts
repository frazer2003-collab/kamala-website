import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bahtToSatang,
  formatSatang,
  parseBahtToSatang,
  satangToBaht,
} from "./desk-money";

describe("desk money", () => {
  it("converts baht to integer satang", () => {
    assert.equal(bahtToSatang(12.34), 1234);
    assert.equal(satangToBaht(1234), 12.34);
  });

  it("parses staff-entered baht without floating-point drift", () => {
    assert.equal(parseBahtToSatang("10.05"), 1005);
    assert.equal(parseBahtToSatang("10"), 1000);
    assert.equal(parseBahtToSatang("10.5"), 1050);
    assert.equal(parseBahtToSatang("10.005"), null);
    assert.equal(parseBahtToSatang("-1"), null);
  });

  it("formats satang as Thai baht", () => {
    assert.equal(formatSatang(123450), "฿1,234.50");
    assert.equal(formatSatang(120000), "฿1,200.00");
  });
});
