import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billLineFoodDrinkCostSatang,
  computeDeskGrossProfit,
  isoMonthRangeContaining,
  isoWeekRangeContaining,
  sumExpenseSatang,
} from "./desk-expenses";

describe("desk expenses", () => {
  it("sums expense amounts", () => {
    assert.equal(
      sumExpenseSatang([
        { amountSatang: 100 },
        { amountSatang: 250 },
      ]),
      350,
    );
  });

  it("builds week and month ranges", () => {
    // 2026-11-07 is Saturday → week Mon 2 Nov … Sun 8 Nov
    assert.deepEqual(isoWeekRangeContaining("2026-11-07"), {
      fromIso: "2026-11-02",
      toIso: "2026-11-08",
    });
    assert.deepEqual(isoMonthRangeContaining("2026-11-07"), {
      fromIso: "2026-11-01",
      toIso: "2026-11-30",
    });
  });

  it("computes gross profit from room + bills − expenses − COGS", () => {
    const profit = computeDeskGrossProfit({
      roomRevenueSatang: 1_000_000,
      billRevenueSatang: 200_000,
      expenseSatang: 150_000,
      foodDrinkCostSatang: 50_000,
    });
    assert.equal(profit.grossProfitSatang, 1_000_000);
    assert.equal(billLineFoodDrinkCostSatang({ quantity: 3, costSatang: 4000 }), 12000);
  });
});
