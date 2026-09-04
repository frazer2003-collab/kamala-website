import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStaffTimelineDays } from "./calendar";
import type { StaffBooking } from "./booking-requests";
import {
  buildUnitTimelineBars,
  getClippedBarRange,
  timelineBarEndEdge,
  timelineBarStartEdge,
} from "./calendar-timeline";

function booking(partial: {
  id: string;
  guest: string;
  arrivalDate: string;
  departureDate: string;
  roomUnitId?: string | null;
}): StaffBooking {
  return {
    id: partial.id,
    guest: partial.guest,
    room: "Superior",
    dates: `${partial.arrivalDate} - ${partial.departureDate}`,
    nights: 1,
    status: "confirmed",
    requestedAt: "2026-07-01T00:00:00.000Z",
    note: "",
    contact: "guest@example.com",
    phone: "",
    arrivalDate: partial.arrivalDate,
    departureDate: partial.departureDate,
    roomId: "courtyard",
    estimatedTotal: 700,
    depositAmount: 200,
    depositPaid: true,
    bookingSource: null,
    stayStatus: "expected",
    stayEndReason: null,
    staffNote: "",
    roomUnitId: partial.roomUnitId ?? "unit-1",
    roomNumber: "1",
    bedSetup: null,
    databaseId: partial.id,
    bankTransferClaimed: false,
    stripePaymentIntentId: null,
  };
}

describe("getClippedBarRange full-night stay geometry", () => {
  const days = buildStaffTimelineDays("2026-07-01", "2026-07-05");

  it("fills check-in through the night before checkout", () => {
    const range = getClippedBarRange("2026-07-01", "2026-07-03", days);

    assert.deepEqual(range, {
      startCol: 1,
      span: 2,
      startInset: 0,
      endInset: 0,
      continuesLeft: false,
      continuesRight: false,
    });
    assert.equal(timelineBarStartEdge(range!), 0);
    assert.equal(timelineBarEndEdge(range!), 2);
  });

  it("keeps one-night stays as one full arrival-day cell", () => {
    const range = getClippedBarRange("2026-07-02", "2026-07-03", days);

    assert.equal(range?.startCol, 2);
    assert.equal(range?.span, 1);
    assert.equal(range?.startInset, 0);
    assert.equal(range?.endInset, 0);
    assert.equal(timelineBarEndEdge(range!) - timelineBarStartEdge(range!), 1);
  });

  it("hides checkout-only mornings when the last night is before the board", () => {
    const range = getClippedBarRange("2026-06-28", "2026-07-01", days);

    assert.equal(range, null);
  });

  it("fills the last board day when that night is the final night of the stay", () => {
    const range = getClippedBarRange("2026-07-04", "2026-07-06", days);

    assert.equal(range?.startCol, 4);
    assert.equal(range?.span, 2);
    assert.equal(range?.startInset, 0);
    assert.equal(range?.endInset, 0);
    assert.equal(range?.continuesRight, false);
  });

  it("continues right when nights remain past the board", () => {
    const range = getClippedBarRange("2026-07-04", "2026-07-08", days);

    assert.equal(range?.continuesRight, true);
    assert.equal(range?.endInset, 0);
    assert.equal(range?.startInset, 0);
    assert.equal(range?.startCol, 4);
    assert.equal(range?.span, 2);
  });
});

describe("buildUnitTimelineBars same-day turnover lanes", () => {
  const days = buildStaffTimelineDays("2026-07-01", "2026-07-05");

  it("places checkout and check-in on the same day in one lane", () => {
    const bars = buildUnitTimelineBars({
      bookings: [
        booking({
          id: "out",
          guest: "Leaving",
          arrivalDate: "2026-06-30",
          departureDate: "2026-07-02",
        }),
        booking({
          id: "in",
          guest: "Arriving",
          arrivalDate: "2026-07-02",
          departureDate: "2026-07-04",
        }),
      ],
      calendarDays: days,
    });

    assert.equal(bars.length, 2);
    assert.equal(bars[0]?.lane, 0);
    assert.equal(bars[1]?.lane, 0);
    assert.ok(timelineBarEndEdge(bars[0]!) <= timelineBarStartEdge(bars[1]!));
  });

  it("marks short visual stays compact", () => {
    const bars = buildUnitTimelineBars({
      bookings: [
        booking({
          id: "one",
          guest: "One night",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-02",
        }),
      ],
      calendarDays: days,
    });

    assert.equal(bars[0]?.compact, true);
    assert.equal(bars[0]?.span, 1);
  });
});
