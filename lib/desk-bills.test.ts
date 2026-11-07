import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billTotalSatang, planBillClear } from "./desk-bills";

const sellables = [
  {
    id: "breakfast",
    priceSatang: 25000,
    ingredients: [
      { countedItemId: "egg", quantity: 2 },
      { countedItemId: "bread", quantity: 2 },
    ],
  },
  {
    id: "coffee",
    priceSatang: 8000,
    ingredients: [{ countedItemId: "beans", quantity: 18 }],
  },
];

describe("desk bills", () => {
  it("totals line quantities in satang", () => {
    assert.equal(
      billTotalSatang(
        [
          { sellableItemId: "breakfast", quantity: 2 },
          { sellableItemId: "coffee", quantity: 1 },
        ],
        sellables,
      ),
      58000,
    );
  });

  it("plans aggregated negative stock movements for an open bill", () => {
    assert.deepEqual(
      planBillClear(
        {
          id: "bill-1",
          status: "open",
          lines: [
            { id: "line-1", sellableItemId: "breakfast", quantity: 2 },
          ],
        },
        sellables,
      ),
      [
        {
          billId: "bill-1",
          billLineId: "line-1",
          countedItemId: "egg",
          quantity: -4,
          reason: "bill_sale",
        },
        {
          billId: "bill-1",
          billLineId: "line-1",
          countedItemId: "bread",
          quantity: -4,
          reason: "bill_sale",
        },
      ],
    );
  });

  it("plans no movements when the bill is already cleared", () => {
    assert.deepEqual(
      planBillClear(
        {
          id: "bill-1",
          status: "cleared",
          lines: [
            { id: "line-1", sellableItemId: "breakfast", quantity: 2 },
          ],
        },
        sellables,
      ),
      [],
    );
  });
});
