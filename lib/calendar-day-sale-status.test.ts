import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDaySaleStatus, getDaySaleStatusLabel } from "./calendar-timeline";

describe("getDaySaleStatus", () => {
  it("marks nights with more stays than capacity as overbooked", () => {
    assert.equal(getDaySaleStatus("room-1", "2026-08-01", [], 2, 3), "overbooked");
    assert.equal(getDaySaleStatusLabel("overbooked"), "Overbooked");
  });

  it("marks exact capacity as sold out and spare capacity as bookable", () => {
    assert.equal(getDaySaleStatus("room-1", "2026-08-01", [], 2, 2), "sold-out");
    assert.equal(getDaySaleStatus("room-1", "2026-08-01", [], 2, 1), "bookable");
  });
});
