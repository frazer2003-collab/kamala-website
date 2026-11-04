import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countUnassignedDoors,
  staffHomeTodayHref,
  staffHomeUnassignedHref,
  summarizeStaffHomeToday,
} from "./staff-home";

describe("summarizeStaffHomeToday", () => {
  it("counts arrivals, departures, and in-house for property today", () => {
    const summary = summarizeStaffHomeToday({
      todayIso: "2026-11-04",
      bookings: [
        { arrivalDate: "2026-11-04", departureDate: "2026-11-07", roomUnitId: "u1" },
        { arrivalDate: "2026-11-01", departureDate: "2026-11-04", roomUnitId: "u2" },
        { arrivalDate: "2026-11-02", departureDate: "2026-11-06", roomUnitId: "u3" },
        { arrivalDate: "2026-11-10", departureDate: "2026-11-12", roomUnitId: null },
      ],
      channelStays: [
        { startDate: "2026-11-04", endDate: "2026-11-05", roomUnitId: "u4" },
      ],
    });

    assert.deepEqual(summary, { arriving: 2, departing: 1, inHouse: 3 });
  });
});

describe("countUnassignedDoors", () => {
  it("counts future stays missing a known door", () => {
    const known = new Set(["u1", "u2"]);
    assert.equal(
      countUnassignedDoors({
        todayIso: "2026-11-04",
        knownUnitIds: known,
        bookings: [
          { arrivalDate: "2026-11-05", departureDate: "2026-11-07", roomUnitId: null },
          { arrivalDate: "2026-11-05", departureDate: "2026-11-07", roomUnitId: "u1" },
          { arrivalDate: "2026-11-05", departureDate: "2026-11-07", roomUnitId: "gone" },
          { arrivalDate: "2026-10-01", departureDate: "2026-11-04", roomUnitId: null },
        ],
        channelStays: [
          { startDate: "2026-11-06", endDate: "2026-11-08", roomUnitId: null },
        ],
      }),
      3,
    );
  });
});

describe("staff home hrefs", () => {
  it("deep-links calendar to today and unassigned", () => {
    assert.equal(
      staffHomeTodayHref("2026-11-04"),
      "/staff/calendar?month=2026-11&from=2026-11-04&to=2026-11-04",
    );
    assert.equal(
      staffHomeUnassignedHref("2026-11-04"),
      "/staff/calendar?month=2026-11&from=2026-11-04",
    );
  });
});
