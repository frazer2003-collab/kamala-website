import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCalendarMonthStats } from "./calendar-timeline";
import type { CalendarDay } from "./calendar";
import type { Room } from "./content";

function day(iso: string, inCurrentMonth = true): CalendarDay {
  return {
    date: new Date(`${iso}T12:00:00`),
    iso,
    inCurrentMonth,
  };
}

const rooms = [{ id: "r1", availableCount: 1 }] as Room[];

function booking(arrivalDate: string, departureDate: string) {
  return {
    arrivalDate,
    departureDate,
    roomId: "r1",
  } as Parameters<typeof getCalendarMonthStats>[0]["bookings"][number];
}

describe("getCalendarMonthStats departed / arriving", () => {
  // Sparse grid is fine — stats use first/last in-month day as the range.
  const calendarDays = [
    day("2026-06-30", false),
    day("2026-07-01"),
    day("2026-07-31"),
    day("2026-08-01", false),
  ];

  it("counts departed only for checkouts already ended in the viewed month", () => {
    const stats = getCalendarMonthStats({
      bookings: [
        booking("2026-06-28", "2026-07-02"),
        booking("2026-07-10", "2026-07-12"),
        booking("2026-07-25", "2026-08-02"),
        booking("2026-06-01", "2026-06-20"),
      ],
      calendarDays,
      rooms,
      todayIso: "2026-07-20",
    });

    assert.equal(stats.departed, 2);
  });

  it("counts arriving only for future check-ins in the viewed month", () => {
    const stats = getCalendarMonthStats({
      bookings: [
        booking("2026-07-10", "2026-07-12"),
        booking("2026-07-20", "2026-07-22"),
        booking("2026-07-25", "2026-07-28"),
        booking("2026-08-05", "2026-08-08"),
      ],
      calendarDays,
      rooms,
      todayIso: "2026-07-20",
    });

    assert.equal(stats.arriving, 1);
  });

  it("counts current guests as stays occupying today", () => {
    const stats = getCalendarMonthStats({
      bookings: [
        booking("2026-07-18", "2026-07-21"),
        booking("2026-07-20", "2026-07-22"),
        booking("2026-07-10", "2026-07-12"),
        booking("2026-07-21", "2026-07-23"),
      ],
      calendarDays,
      rooms,
      todayIso: "2026-07-20",
    });

    assert.equal(stats.currentGuests, 2);
  });
});
