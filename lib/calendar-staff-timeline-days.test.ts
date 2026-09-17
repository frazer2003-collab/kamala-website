import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAFF_TIMELINE_DEFAULT_MONTHS,
  STAFF_TIMELINE_MAX_MONTHS,
  buildStaffCalendarHref,
  buildStaffTimelineDays,
  clampStaffTimelineDateRange,
  defaultStaffTimelineDateRange,
  defaultStaffTimelineSelectionRange,
  maxStaffTimelineEndIso,
  monthsOverlappingDateRange,
  parseStaffTimelineRange,
} from "./calendar";

describe("buildStaffTimelineDays", () => {
  it("builds an inclusive day range", () => {
    const days = buildStaffTimelineDays("2026-07-01", "2026-07-31");

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-07-31");
    assert.equal(days.length, 31);
    assert.ok(days.every((day) => day.inCurrentMonth));
  });

  it("clamps ranges longer than six calendar months", () => {
    const days = buildStaffTimelineDays("2026-07-01", "2027-06-30");

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-12-31");
  });
});

describe("defaultStaffTimeline ranges", () => {
  it("defaults the selector to one month", () => {
    const range = defaultStaffTimelineSelectionRange("2026-07");

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-07-31");
  });

  it("keeps a six-month scroll horizon from the anchor month", () => {
    const range = defaultStaffTimelineDateRange("2026-07");

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-12-31");
    assert.equal(STAFF_TIMELINE_DEFAULT_MONTHS, 6);
    assert.equal(STAFF_TIMELINE_MAX_MONTHS, 6);
  });
});

describe("parseStaffTimelineRange", () => {
  it("defaults the selector to one month and the board to six", () => {
    const range = parseStaffTimelineRange({ month: "2026-07" });

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-07-31");
    assert.equal(range.boardFromIso, "2026-07-01");
    assert.equal(range.boardToIso, "2026-12-31");
    assert.equal(range.monthKey, "2026-07");
    assert.equal(range.monthCount, 6);
  });

  it("clamps from/to to at most six calendar months", () => {
    const range = parseStaffTimelineRange({
      from: "2026-07-10",
      to: "2027-06-01",
    });

    assert.equal(range.fromIso, "2026-07-10");
    assert.equal(range.toIso, "2026-12-31");
    assert.equal(range.toIso, maxStaffTimelineEndIso("2026-07-10"));
    assert.equal(monthsOverlappingDateRange(range.fromIso, range.toIso).length, 6);
    assert.equal(range.boardFromIso, "2026-07-10");
    assert.equal(range.boardToIso, "2026-12-31");
  });

  it("orders a reversed from/to before clamping", () => {
    const range = parseStaffTimelineRange({
      from: "2026-08-20",
      to: "2026-08-05",
    });

    assert.equal(range.fromIso, "2026-08-05");
    assert.equal(range.toIso, "2026-08-20");
    assert.equal(range.boardFromIso, "2026-08-05");
    assert.equal(range.boardToIso, "2026-08-20");
  });

  it("keeps a custom multi-month from/to as the board window", () => {
    const range = parseStaffTimelineRange({
      from: "2026-07-01",
      to: "2026-08-15",
    });

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-08-15");
    assert.equal(range.boardFromIso, "2026-07-01");
    assert.equal(range.boardToIso, "2026-08-15");
  });

  it("allows a full six-month custom from/to", () => {
    const range = parseStaffTimelineRange({
      from: "2026-07-01",
      to: "2026-12-15",
    });

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-12-15");
    assert.equal(range.boardFromIso, "2026-07-01");
    assert.equal(range.boardToIso, "2026-12-15");
    assert.equal(monthsOverlappingDateRange(range.fromIso, range.toIso).length, 6);
  });
});

describe("clampStaffTimelineDateRange", () => {
  it("keeps a short range intact", () => {
    const range = clampStaffTimelineDateRange("2026-07-01", "2026-08-15");

    assert.deepEqual(range, { fromIso: "2026-07-01", toIso: "2026-08-15" });
  });
});

describe("buildStaffCalendarHref", () => {
  it("preserves from/to alongside month and extras", () => {
    assert.equal(
      buildStaffCalendarHref({
        month: "2026-07",
        from: "2026-07-01",
        to: "2026-07-31",
        booking: "abc",
        extras: { saved: "1" },
      }),
      "/staff/calendar?month=2026-07&from=2026-07-01&to=2026-07-31&booking=abc&saved=1",
    );
  });
});
