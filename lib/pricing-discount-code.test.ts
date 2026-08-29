import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateStayQuoteWithOptionalCode } from "./pricing";

describe("calculateStayQuoteWithOptionalCode", () => {
  it("uses automatic promo when it beats the guest code", () => {
    const quote = calculateStayQuoteWithOptionalCode({
      roomId: "garden",
      baseRate: 1000,
      arrival: "2026-08-01",
      departure: "2026-08-04",
      promotions: [
        {
          roomId: "garden",
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          percentOff: 20,
        },
      ],
      codePercentOff: 10,
    });

    assert.equal(quote.discountSource, "promo");
    assert.equal(quote.codeApplied, false);
    assert.equal(quote.total, 2400);
  });

  it("uses guest code when it beats automatic promo", () => {
    const quote = calculateStayQuoteWithOptionalCode({
      roomId: "garden",
      baseRate: 1000,
      arrival: "2026-08-01",
      departure: "2026-08-04",
      promotions: [
        {
          roomId: "garden",
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          percentOff: 10,
        },
      ],
      codePercentOff: 25,
    });

    assert.equal(quote.discountSource, "code");
    assert.equal(quote.codeApplied, true);
    assert.equal(quote.total, 2250);
  });
});
