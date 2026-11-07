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
