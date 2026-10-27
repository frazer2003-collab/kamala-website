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

  it("keeps past empty nights out of still open", () => {
    const model = buildFinanceSoldPieModel(0, 6, 0, 2, 4);

    assert.equal(model.nightsStillOpen, 2);
    assert.equal(model.nightsPassedUnsold, 4);
    assert.equal(model.fillShare, 0);
  });

  it("labels over-capacity stays for screen readers", () => {
    const model = buildFinanceSoldPieModel(12, 10, 2);

    assert.equal(
      buildFinanceSoldPieAriaLabel(model),
      "Sold 12 of 10 door-nights (100%). 0 still open; 2 nights over capacity",
    );
  });
});
