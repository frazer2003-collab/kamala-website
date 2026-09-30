import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_STAY_NIGHTS } from "./stay-dates";
import {
  alignDepartureToArrival,
  departureBoundsForArrival,
  shiftIsoDate,
} from "./walk-in-stay-dates";

describe("shiftIsoDate", () => {
  it("crosses month and year boundaries", () => {
    assert.equal(shiftIsoDate("2026-01-31", 1), "2026-02-01");
    assert.equal(shiftIsoDate("2026-12-31", 1), "2027-01-01");
    assert.equal(shiftIsoDate("2026-03-01", -1), "2026-02-28");
  });

  it("handles a leap day", () => {
    assert.equal(shiftIsoDate("2028-02-28", 1), "2028-02-29");
  });
});

describe("departureBoundsForArrival", () => {
  it("starts the night after arrival and caps at the stay limit", () => {
    const bounds = departureBoundsForArrival("2026-09-18");
    assert.deepEqual(bounds, {
      min: "2026-09-19",
      max: shiftIsoDate("2026-09-18", MAX_STAY_NIGHTS),
    });
  });

  it("returns null for an unparseable arrival", () => {
    assert.equal(departureBoundsForArrival(""), null);
  });
});

describe("alignDepartureToArrival", () => {
  it("keeps the chosen night count when arrival moves", () => {
    assert.equal(
      alignDepartureToArrival("2026-09-20", "2026-09-21", "2026-09-18"),
      "2026-09-23",
    );
  });

  it("keeps the night count when arrival moves backwards", () => {
    assert.equal(
      alignDepartureToArrival("2026-09-15", "2026-09-21", "2026-09-18"),
      "2026-09-18",
    );
  });

  it("pushes a same-day departure to one night", () => {
    assert.equal(
      alignDepartureToArrival("2026-09-20", "2026-09-20"),
      "2026-09-21",
    );
  });

  it("pulls an over-long stay back to the limit", () => {
    assert.equal(
      alignDepartureToArrival("2026-09-20", "2028-01-01"),
      shiftIsoDate("2026-09-20", MAX_STAY_NIGHTS),
    );
  });

  it("leaves a valid range untouched without a previous arrival", () => {
    assert.equal(
      alignDepartureToArrival("2026-09-20", "2026-09-24"),
      "2026-09-24",
    );
  });

  it("returns the departure unchanged when arrival is cleared", () => {
    assert.equal(alignDepartureToArrival("", "2026-09-24"), "2026-09-24");
  });
});
