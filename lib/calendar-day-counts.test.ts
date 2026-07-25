import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDayOccupancyMap,
  countStaysOnDay,
  getDayOccupancyLevel,
} from "./calendar-day-counts";
import type { CalendarDay } from "./calendar";

function day(iso: string, inCurrentMonth = true): CalendarDay {
  return {
    date: new Date(`${iso}T12:00:00`),
    iso,
    inCurrentMonth,
  };
}

describe("countStaysOnDay", () => {
  it("counts direct and channel stays that occupy the night", () => {
    const count = countStaysOnDay("2026-07-20", {
      bookings: [
        { arrivalDate: "2026-07-18", departureDate: "2026-07-21" },
        { arrivalDate: "2026-07-20", departureDate: "2026-07-22" },
        { arrivalDate: "2026-07-21", departureDate: "2026-07-23" },
      ],
      channelStays: [
        { startDate: "2026-07-19", endDate: "2026-07-21" },
        { startDate: "2026-07-10", endDate: "2026-07-12" },
      ],
    });

    assert.equal(count, 3);
  });

  it("ignores checkout day (departure is exclusive)", () => {
    const count = countStaysOnDay("2026-07-21", {
      bookings: [{ arrivalDate: "2026-07-18", departureDate: "2026-07-21" }],
      channelStays: [{ startDate: "2026-07-19", endDate: "2026-07-21" }],
    });

    assert.equal(count, 0);
  });
});

describe("buildDayOccupancyMap", () => {
  it("builds per-day counts and occupancy against capacity", () => {
    const map = buildDayOccupancyMap({
      calendarDays: [day("2026-07-20"), day("2026-07-21", false)],
      capacity: 4,
      bookings: [
        { arrivalDate: "2026-07-20", departureDate: "2026-07-22" },
        { arrivalDate: "2026-07-20", departureDate: "2026-07-21" },
      ],
      channelStays: [{ startDate: "2026-07-20", endDate: "2026-07-22" }],
    });

    assert.deepEqual(map.get("2026-07-20"), {
      iso: "2026-07-20",
      bookingCount: 3,
      capacity: 4,
      occupancyPercent: 75,
      isFull: false,
    });
    assert.deepEqual(map.get("2026-07-21"), {
      iso: "2026-07-21",
      bookingCount: 2,
      capacity: 4,
      occupancyPercent: 50,
      isFull: false,
    });
  });

  it("marks full when bookings meet or exceed capacity", () => {
    const map = buildDayOccupancyMap({
      calendarDays: [day("2026-07-20")],
      capacity: 2,
      bookings: [
        { arrivalDate: "2026-07-20", departureDate: "2026-07-21" },
        { arrivalDate: "2026-07-20", departureDate: "2026-07-22" },
      ],
      channelStays: [],
    });

    assert.equal(map.get("2026-07-20")?.isFull, true);
    assert.equal(map.get("2026-07-20")?.occupancyPercent, 100);
  });
});

describe("getDayOccupancyLevel", () => {
  it("returns empty / light / medium / full buckets for wash styling", () => {
    assert.equal(getDayOccupancyLevel({ bookingCount: 0, occupancyPercent: 0, isFull: false }), "empty");
    assert.equal(getDayOccupancyLevel({ bookingCount: 1, occupancyPercent: 20, isFull: false }), "light");
    assert.equal(getDayOccupancyLevel({ bookingCount: 2, occupancyPercent: 55, isFull: false }), "medium");
    assert.equal(getDayOccupancyLevel({ bookingCount: 4, occupancyPercent: 100, isFull: true }), "full");
  });
});
