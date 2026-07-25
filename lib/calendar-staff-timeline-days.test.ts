import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAFF_TIMELINE_PAST_LOOKBACK_DAYS,
  buildStaffTimelineDays,
} from "./calendar";

describe("buildStaffTimelineDays", () => {
  it("keeps only a short past lookback in the current month", () => {
    const days = buildStaffTimelineDays(2026, 7, {
      todayIso: "2026-07-25",
      pastLookbackDays: 2,
    });

    assert.equal(days[0]?.iso, "2026-07-23");
    assert.equal(days[days.length - 1]?.iso, "2026-07-31");
    assert.ok(days.every((day) => day.iso >= "2026-07-23"));
    assert.equal(
      days.filter((day) => day.iso < "2026-07-25").length,
      STAFF_TIMELINE_PAST_LOOKBACK_DAYS,
    );
  });

  it("can reach into the previous month when today is near the start", () => {
    const days = buildStaffTimelineDays(2026, 7, {
      todayIso: "2026-07-01",
      pastLookbackDays: 2,
    });

    assert.equal(days[0]?.iso, "2026-06-29");
    assert.equal(days[0]?.inCurrentMonth, false);
    assert.equal(days.find((day) => day.iso === "2026-07-01")?.inCurrentMonth, true);
    assert.equal(days[days.length - 1]?.iso, "2026-07-31");
  });

  it("shows the full month when browsing a future month", () => {
    const days = buildStaffTimelineDays(2026, 8, {
      todayIso: "2026-07-25",
      pastLookbackDays: 2,
    });

    assert.equal(days[0]?.iso, "2026-08-01");
    assert.equal(days[days.length - 1]?.iso, "2026-08-31");
    assert.equal(days.length, 31);
  });

  it("shows the full month when browsing a past month", () => {
    const days = buildStaffTimelineDays(2026, 6, {
      todayIso: "2026-07-25",
      pastLookbackDays: 2,
    });

    assert.equal(days[0]?.iso, "2026-06-01");
    assert.equal(days[days.length - 1]?.iso, "2026-06-30");
    assert.equal(days.length, 30);
  });
});
