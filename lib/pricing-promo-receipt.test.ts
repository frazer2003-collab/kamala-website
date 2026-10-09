import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateStayQuote,
  getPromotionNoteForStay,
  getStayPercentOff,
  type RoomPromotionRate,
} from "./pricing";

const tourLabel = "10% discount on any tours .";

const promotions: RoomPromotionRate[] = [
  {
    roomId: "superior",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    percentOff: 30,
    label: tourLabel,
  },
  {
    roomId: "deluxe",
    startDate: "2026-10-09",
    endDate: "2026-10-31",
    percentOff: 30,
    label: null,
  },
  {
    roomId: "deluxe",
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    percentOff: 15,
    label: "Smaller offer",
  },
];

describe("checkout promotion line", () => {
  it("reports the real room saving, not the number inside a staff label", () => {
    const quote = calculateStayQuote({
      roomId: "superior",
      baseRate: 1000,
      arrival: "2026-10-10",
      departure: "2026-10-12",
      promotions,
    });
    assert.equal(getStayPercentOff(quote), 30);
    assert.equal(
      getPromotionNoteForStay("superior", "2026-10-10", "2026-10-12", promotions),
      tourLabel.trim(),
    );
  });

  it("only uses a label from a promotion that actually priced the stay", () => {
    assert.equal(
      getPromotionNoteForStay("deluxe", "2026-10-10", "2026-10-12", promotions),
      null,
    );
  });

  it("has no note or percent when nothing is discounted", () => {
    assert.equal(getStayPercentOff({ baseTotal: 2000, total: 2000 }), null);
    assert.equal(
      getPromotionNoteForStay("superior", "2026-12-01", "2026-12-03", promotions),
      null,
    );
  });
});
