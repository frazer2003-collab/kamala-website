import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAFF_TIMELINE_MAX_MONTHS,
  buildStaffTimelineDays,
  clampCalendarMonthRange,
  formatCalendarMonthRangeLabel,
  parseStaffTimelineRange,
} from "./calendar";

describe("buildStaffTimelineDays", () => {
  it("shows the full current month when span is one month", () => {
    const days = buildStaffTimelineDays(2026, 7, { monthCount: 1 });

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-07-31");
    assert.equal(days.length, 31);
    assert.ok(days.every((day) => day.inCurrentMonth));
  });

  it("extends into the next two months by default", () => {
    const days = buildStaffTimelineDays(2026, 7);

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-09-30");
    assert.equal(days.length, 31 + 31 + 30);
  });

  it("honors an explicit through month and clamps to three months", () => {
    const days = buildStaffTimelineDays(2026, 7, {
      through: { year: 2026, month: 12 },
    });

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-09-30");
  });

  it("shows a past or future single month in full", () => {
    const past = buildStaffTimelineDays(2026, 6, { monthCount: 1 });
    const future = buildStaffTimelineDays(2026, 8, { monthCount: 1 });

    assert.equal(past[0]?.iso, "2026-06-01");
    assert.equal(past[past.length - 1]?.iso, "2026-06-30");
    assert.equal(future[0]?.iso, "2026-08-01");
    assert.equal(future[future.length - 1]?.iso, "2026-08-31");
  });
});

describe("parseStaffTimelineRange", () => {
  it("defaults through to two months after the anchor", () => {
    const range = parseStaffTimelineRange("2026-07");

    assert.equal(range.monthKey, "2026-07");
    assert.equal(range.throughKey, "2026-09");
    assert.equal(range.monthCount, 3);
    assert.equal(range.months.length, 3);
  });

  it("clamps an oversized through param to the max span", () => {
    const range = parseStaffTimelineRange("2026-07", "2026-12");

    assert.equal(range.throughKey, "2026-09");
    assert.equal(range.monthCount, STAFF_TIMELINE_MAX_MONTHS);
  });

  it("orders a reversed through before clamping", () => {
    const range = parseStaffTimelineRange("2026-09", "2026-07");

    assert.equal(range.monthKey, "2026-07");
    assert.equal(range.throughKey, "2026-09");
  });
});

describe("clampCalendarMonthRange", () => {
  it("keeps a two-month range intact", () => {
    const range = clampCalendarMonthRange(
      { year: 2026, month: 7 },
      { year: 2026, month: 8 },
    );

    assert.equal(range.monthCount, 2);
    assert.deepEqual(range.end, { year: 2026, month: 8 });
  });
});

describe("formatCalendarMonthRangeLabel", () => {
  it("formats a single month and a cross-month range", () => {
    assert.equal(
      formatCalendarMonthRangeLabel(
        { year: 2026, month: 7 },
        { year: 2026, month: 7 },
      ),
      "July 2026",
    );
    assert.match(
      formatCalendarMonthRangeLabel(
        { year: 2026, month: 7 },
        { year: 2026, month: 9 },
      ),
      /Jul.*Sep.*2026/,
    );
  });
});
