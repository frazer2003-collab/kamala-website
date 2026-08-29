import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFinanceSoldPieAriaLabel,
  buildFinanceSoldPieModel,
} from "./finance-sold-pie";

describe("buildFinanceSoldPieModel", () => {
  it("keeps uncapped sold nights in the model", () => {
    const model = buildFinanceSoldPieModel(12, 10, 2);

    assert.equal(model.nightsSold, 12);
    assert.equal(model.capacity, 10);
    assert.equal(model.nightsOverCapacity, 2);
    assert.equal(model.soldPercent, 100);
    assert.equal(model.isOverCapacity, true);
  });

  it("derives over capacity when not passed explicitly", () => {
    const model = buildFinanceSoldPieModel(12, 10);

    assert.equal(model.nightsOverCapacity, 2);
  });

  it("labels over-capacity stays for screen readers", () => {
    const model = buildFinanceSoldPieModel(12, 10, 2);

    assert.equal(
      buildFinanceSoldPieAriaLabel(model),
      "Sold 12 of 10 door-nights (100%); 2 nights over capacity",
    );
  });
});
