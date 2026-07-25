import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

  it("clamps ranges longer than three calendar months", () => {
    const days = buildStaffTimelineDays("2026-07-01", "2026-12-31");

    assert.equal(days[0]?.iso, "2026-07-01");
    assert.equal(days[days.length - 1]?.iso, "2026-09-30");
  });
});

describe("defaultStaffTimeline ranges", () => {
  it("defaults the selector to one month", () => {
    const range = defaultStaffTimelineSelectionRange("2026-07");

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-07-31");
  });

  it("keeps a three-month scroll horizon from the anchor month", () => {
    const range = defaultStaffTimelineDateRange("2026-07");

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-09-30");
  });
});

describe("parseStaffTimelineRange", () => {
  it("defaults the selector to one month and the board to three", () => {
    const range = parseStaffTimelineRange({ month: "2026-07" });

    assert.equal(range.fromIso, "2026-07-01");
    assert.equal(range.toIso, "2026-07-31");
    assert.equal(range.boardFromIso, "2026-07-01");
    assert.equal(range.boardToIso, "2026-09-30");
    assert.equal(range.monthKey, "2026-07");
    assert.equal(range.monthCount, 3);
  });

  it("clamps from/to to at most three calendar months", () => {
    const range = parseStaffTimelineRange({
      from: "2026-07-10",
      to: "2026-12-01",
    });

    assert.equal(range.fromIso, "2026-07-10");
    assert.equal(range.toIso, "2026-09-30");
    assert.equal(range.toIso, maxStaffTimelineEndIso("2026-07-10"));
    assert.equal(monthsOverlappingDateRange(range.fromIso, range.toIso).length, 3);
    assert.equal(range.boardFromIso, "2026-07-10");
    assert.equal(range.boardToIso, "2026-09-30");
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
