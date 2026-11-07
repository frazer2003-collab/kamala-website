import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectStockLevels } from "./desk-stock-projections";

describe("stock projections", () => {
  it("ranks low stock ahead of healthy items using recent bill sales", () => {
    const now = new Date("2026-11-07T12:00:00.000Z");
    const rows = projectStockLevels(
      [
        { id: "water", onHand: 10, minimum: 4, active: true },
        { id: "soap", onHand: 40, minimum: 5, active: true },
      ],
      [
        {
          countedItemId: "water",
          quantity: -14,
          reason: "bill_sale",
          occurredAt: "2026-11-01T00:00:00.000Z",
        },
        {
          countedItemId: "soap",
          quantity: -2,
          reason: "bill_sale",
          occurredAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      { now, windowDays: 14 },
    );

    assert.equal(rows[0]?.countedItemId, "water");
    assert.ok((rows[0]?.avgDailyUse ?? 0) > 0);
    assert.ok((rows[0]?.daysToMinimum ?? 99) < (rows[1]?.daysToMinimum ?? 0));
  });
});
