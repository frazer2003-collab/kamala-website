import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapCountedItemRows,
  mapLaundryRow,
  mapSellableRows,
} from "./desk-ops-data";

describe("desk operations data mapping", () => {
  it("maps counted items and derives on-hand quantity", () => {
    const items = mapCountedItemRows(
      [
        {
          id: "eggs",
          property_id: "kamala",
          name_th: "ไข่",
          name_en: "Eggs",
          unit: "count",
          opening_quantity: 12,
          minimum: 6,
          cost_satang: 0,
          sell_price_satang: 0,
          active: true,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        },
      ],
      [
        {
          counted_item_id: "eggs",
          quantity: 8,
        },
        {
          counted_item_id: "eggs",
          quantity: -3,
        },
      ],
    );

    assert.equal(items[0]?.onHand, 17);
    assert.equal(items[0]?.nameEn, "Eggs");
  });

  it("combines sellables with ingredients and attached laundry", () => {
    const items = mapSellableRows(
      [
        {
          id: "room",
          property_id: "kamala",
          name_th: "ห้อง",
          name_en: "Room",
          category: "room",
          price_satang: 120000,
          cost_satang: 0,
          minimum: 0,
          active: true,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        },
      ],
      [{ sellable_item_id: "room", counted_item_id: "water", quantity: 2 }],
      [{ room_sellable_item_id: "room", laundry_sellable_item_id: "sheets" }],
    );

    assert.deepEqual(items[0]?.ingredients, [
      { countedItemId: "water", quantity: 2 },
    ]);
    assert.deepEqual(items[0]?.attachedLaundryIds, ["sheets"]);
  });

  it("maps laundry rows to camelCase", () => {
    assert.deepEqual(
      mapLaundryRow({
        id: "laundry-1",
        property_id: "kamala",
        name: "Room 4",
        category: "sheets",
        grams: null,
        count: 2,
        lines: [{ key: "pillow_case", quantity: 2 }],
        staff_note: "Two pillowcases",
        email: null,
        recorded_at: "2026-11-07T01:00:00Z",
        received_at: null,
        price_satang: 15000,
        status: "unpaid",
        created_at: "2026-11-07T01:00:00Z",
        updated_at: "2026-11-07T01:00:00Z",
      }),
      {
        id: "laundry-1",
        name: "Room 4",
        category: "sheets",
        grams: null,
        count: 2,
        lines: [{ key: "pillow_case", quantity: 2 }],
        staffNote: "Two pillowcases",
        email: null,
        recordedAt: "2026-11-07T01:00:00Z",
        receivedAt: null,
        priceSatang: 15000,
        status: "unpaid",
        createdAt: "2026-11-07T01:00:00Z",
        updatedAt: "2026-11-07T01:00:00Z",
      },
    );
  });
});
