import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  headroom,
  mealsLeft,
  onHand,
  sortByShortestHeadroom,
} from "./desk-stock";

describe("desk stock", () => {
  it("calculates on hand from opening stock and movements", () => {
    assert.equal(onHand(10, [{ quantity: 5 }, { quantity: -3 }]), 12);
  });

  it("calculates and sorts minimum headroom", () => {
    assert.equal(headroom(12, 5), 7);
    assert.deepEqual(
      sortByShortestHeadroom([
        { id: "eggs", onHand: 20, minimum: 6 },
        { id: "bread", onHand: 8, minimum: 6 },
      ]).map((item) => item.id),
      ["bread", "eggs"],
    );
  });

  it("returns portions available before any ingredient reaches minimum", () => {
    assert.equal(
      mealsLeft([
        { onHand: 20, minimum: 4, quantityPerMeal: 2 },
        { onHand: 1200, minimum: 400, quantityPerMeal: 150 },
      ]),
      5,
    );
  });

  it("returns zero portions when an ingredient is at minimum", () => {
    assert.equal(
      mealsLeft([{ onHand: 4, minimum: 4, quantityPerMeal: 2 }]),
      0,
    );
  });
});
