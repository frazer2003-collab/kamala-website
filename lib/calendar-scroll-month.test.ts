import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCalendarMonthLabelFromIso,
  pickLeadingVisibleCalendarDayIso,
} from "./calendar";

describe("formatCalendarMonthLabelFromIso", () => {
  it("formats a day iso as a long month label", () => {
    assert.equal(formatCalendarMonthLabelFromIso("2026-08-15"), "August 2026");
  });
});

describe("pickLeadingVisibleCalendarDayIso", () => {
  it("returns the first day that clears the sticky label edge", () => {
    const days = [
      { iso: "2026-07-30", left: 100, right: 130 },
      { iso: "2026-07-31", left: 132, right: 162 },
      { iso: "2026-08-01", left: 164, right: 194 },
      { iso: "2026-08-02", left: 196, right: 226 },
    ];

    assert.equal(pickLeadingVisibleCalendarDayIso(days, 163), "2026-08-01");
  });

  it("returns the last day when scrolled past the end", () => {
    const days = [
      { iso: "2026-09-29", left: -40, right: -10 },
      { iso: "2026-09-30", left: -8, right: 22 },
    ];

    assert.equal(pickLeadingVisibleCalendarDayIso(days, 100), "2026-09-30");
  });

  it("returns null for an empty day list", () => {
    assert.equal(pickLeadingVisibleCalendarDayIso([], 100), null);
  });
});
