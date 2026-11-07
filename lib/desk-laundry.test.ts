import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLaundryMeasure,
  validateLaundryRecord,
} from "./desk-laundry";

describe("desk laundry", () => {
  it("formats grams and count measures", () => {
    assert.equal(formatLaundryMeasure({ grams: 1500, count: null }), "1.5 kg");
    assert.equal(formatLaundryMeasure({ grams: null, count: 3 }), "3 pieces");
    assert.equal(formatLaundryMeasure({ grams: null, count: 1 }), "1 piece");
  });

  it("formats sheet line items", () => {
    assert.equal(
      formatLaundryMeasure({
        grams: null,
        count: 3,
        lines: [
          { key: "duvet_cover", quantity: 1 },
          { key: "pillow_case", quantity: 2 },
        ],
      }),
      "Duvet cover ×1, Pillow case ×2",
    );
  });

  it("requires exactly one positive measure", () => {
    assert.deepEqual(
      validateLaundryRecord({
        name: "Guest wash",
        category: "laundry",
        grams: 1000,
        count: 2,
        email: null,
      }),
      ["Enter grams or count, not both."],
    );

    assert.deepEqual(
      validateLaundryRecord({
        name: "Guest wash",
        category: "laundry",
        grams: null,
        count: null,
        email: null,
      }),
      ["Enter grams or count."],
    );
  });

  it("accepts sheets with line quantities", () => {
    assert.deepEqual(
      validateLaundryRecord({
        name: "Room 4",
        category: "sheets",
        grams: null,
        count: null,
        lines: [{ key: "pillow_case", quantity: 2 }],
        email: null,
      }),
      [],
    );
  });

  it("validates required names and optional email addresses", () => {
    assert.deepEqual(
      validateLaundryRecord({
        name: " ",
        category: "sheets",
        grams: null,
        count: 4,
        email: "not-an-email",
      }),
      ["Name is required.", "Enter a valid email address."],
    );
  });
});
