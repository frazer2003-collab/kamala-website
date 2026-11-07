import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billLineSellableIdsWithoutStockCut,
  billTotalSatang,
  planBillClear,
} from "./desk-bills";

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
  {
    id: "tour",
    priceSatang: 150000,
    ingredients: [],
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

  it("uses per-line unit price override for comps and custom prices", () => {
    assert.equal(
      billTotalSatang(
        [
          {
            sellableItemId: "breakfast",
            quantity: 2,
            unitPriceSatang: 0,
          },
          {
            sellableItemId: "coffee",
            quantity: 1,
            unitPriceSatang: 5000,
          },
        ],
        sellables,
      ),
      5000,
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

  it("lists sellables on the bill that will not cut stock", () => {
    assert.deepEqual(
      billLineSellableIdsWithoutStockCut(
        [
          { sellableItemId: "breakfast", quantity: 1 },
          { sellableItemId: "tour", quantity: 2 },
          { sellableItemId: "tour", quantity: 1 },
        ],
        sellables,
      ),
      ["tour"],
    );
  });
});
