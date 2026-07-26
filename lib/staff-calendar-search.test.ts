import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countPrepareHorizonArrivals,
  stayMatchesStaffCalendarQuery,
} from "./staff-calendar-search";
import type { StaffBooking } from "./booking-requests";
import type { StaffRoomBlock } from "./room-blocks";

function booking(partial: Partial<StaffBooking> & Pick<StaffBooking, "id" | "arrivalDate">): StaffBooking {
  return {
    databaseId: null,
    bankTransferClaimed: false,
    guest: "Guest",
    roomId: "deluxe",
    departureDate: "2026-08-05",
    ...partial,
  } as StaffBooking;
}

describe("stayMatchesStaffCalendarQuery", () => {
  it("matches guest name and room number case-insensitively", () => {
    assert.equal(
      stayMatchesStaffCalendarQuery("mai", ["Mai Lin", "114"]),
      true,
    );
    assert.equal(stayMatchesStaffCalendarQuery("114", ["Mai Lin", "114"]), true);
    assert.equal(stayMatchesStaffCalendarQuery("zzz", ["Mai Lin", "114"]), false);
  });

  it("treats empty query as match-all", () => {
    assert.equal(stayMatchesStaffCalendarQuery("  ", ["anyone"]), true);
  });
});

describe("countPrepareHorizonArrivals", () => {
  it("counts today through +3 days including channel stays", () => {
    const bookings = [
      booking({ id: "a", arrivalDate: "2026-08-01", guest: "A" }),
      booking({ id: "b", arrivalDate: "2026-08-04", guest: "B" }),
      booking({ id: "c", arrivalDate: "2026-08-05", guest: "C" }),
      booking({ id: "d", arrivalDate: "2026-07-31", guest: "D" }),
    ];
    const blocks: StaffRoomBlock[] = [
      {
        id: "ch1",
        databaseId: null,
        roomId: "deluxe",
        startDate: "2026-08-02",
        endDate: "2026-08-04",
        reason: "Channel",
        staffNote: "",
        guestName: "Channel",
        guestEmail: "",
        guestPhone: "",
        icalFeedId: "feed-1",
        channelLabel: "Booking.com",
        roomUnitId: null,
        roomNumber: null,
      },
    ];

    assert.equal(countPrepareHorizonArrivals(bookings, blocks, "2026-08-01"), 3);
  });
});
