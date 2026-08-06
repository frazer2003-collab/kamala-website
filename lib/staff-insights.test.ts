import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStaffInsightsReport,
  countNightsInMonth,
} from "@/lib/staff-insights";
import type { StaffBooking } from "@/lib/booking-requests";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import type { Room } from "@/lib/content";
import type { RoomPromotionRate } from "@/lib/pricing";

function booking(partial: Partial<StaffBooking> & Pick<StaffBooking, "roomId" | "arrivalDate" | "departureDate">): StaffBooking {
  return {
    id: "b1",
    databaseId: "db1",
    guest: "Guest",
    room: "Room",
    dates: "",
    nights: 1,
    status: "confirmed",
    requestedAt: "",
    note: "",
    contact: "",
    phone: "",
    estimatedTotal: 0,
    depositAmount: 0,
    depositPaid: true,
    bookingSource: null,
    stayStatus: "expected",
    stayEndReason: null,
    staffNote: "",
    roomUnitId: null,
    roomNumber: null,
    bedSetup: null,
    bankTransferClaimed: false,
    ...partial,
  };
}

function channel(partial: Partial<StaffRoomBlock> & Pick<StaffRoomBlock, "roomId" | "startDate" | "endDate">): StaffRoomBlock {
  return {
    id: "c1",
    databaseId: "cdb1",
    reason: "",
    staffNote: "",
    guestName: "OTA Guest",
    guestEmail: "",
    guestPhone: "",
    bookingSource: "airbnb",
    icalFeedId: "feed-1",
    channelLabel: "Airbnb",
    roomUnitId: null,
    roomNumber: null,
    ...partial,
  };
}

const rooms: Room[] = [
  {
    id: "superior",
    name: "Superior",
    shortName: "Superior",
    rate: 700,
    sleeps: "2",
    outlook: "",
    availableCount: 2,
    summary: "",
    amenities: [],
    tone: "courtyard",
    imageUrl: null,
    galleryUrls: [],
  },
  {
    id: "family",
    name: "Family",
    shortName: "Family",
    rate: 900,
    sleeps: "3",
    outlook: "",
    availableCount: 1,
    summary: "",
    amenities: [],
    tone: "garden",
    imageUrl: null,
    galleryUrls: [],
  },
];

describe("countNightsInMonth", () => {
  it("counts nights clipped to the month", () => {
    assert.equal(
      countNightsInMonth("2026-06-28", "2026-07-03", "2026-07-01", "2026-07-31"),
      2,
    );
    assert.equal(
      countNightsInMonth("2026-07-10", "2026-07-13", "2026-07-01", "2026-07-31"),
      3,
    );
    assert.equal(
      countNightsInMonth("2026-07-30", "2026-08-02", "2026-07-01", "2026-07-31"),
      2,
    );
  });

  it("returns 0 when the stay misses the month", () => {
    assert.equal(
      countNightsInMonth("2026-06-01", "2026-06-05", "2026-07-01", "2026-07-31"),
      0,
    );
  });
});

describe("buildStaffInsightsReport", () => {
  it("ranks rooms by nights sold across website and OTA stays", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "family",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-04",
          estimatedTotal: 2700,
          bookingSource: null,
        }),
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-05",
          departureDate: "2026-07-07",
          estimatedTotal: 1400,
          bookingSource: "walk-in",
        }),
      ],
      channelBlocks: [
        channel({
          roomId: "superior",
          startDate: "2026-07-10",
          endDate: "2026-07-15",
          bookingSource: "airbnb",
        }),
      ],
    });

    assert.equal(report.rooms[0]?.roomId, "superior");
    assert.equal(report.rooms[0]?.nightsSold, 7); // 2 walk-in + 5 airbnb
    assert.equal(report.rooms[0]?.stayCount, 2);
    assert.equal(report.rooms[0]?.websiteRevenue, 1400);
    assert.equal(report.rooms[0]?.channelRevenue, 3500); // 5 × 700
    assert.equal(report.rooms[0]?.estimatedRevenue, 4900);
    assert.equal(report.rooms[1]?.roomId, "family");
    assert.equal(report.rooms[1]?.nightsSold, 3);
    assert.equal(report.rooms[1]?.websiteRevenue, 2700);
    assert.equal(report.rooms[1]?.channelRevenue, 0);
    assert.equal(report.totals.nightsSold, 10);
    assert.equal(report.totals.stayCount, 3);
    assert.equal(report.totals.websiteRevenue, 4100);
    assert.equal(report.totals.channelRevenue, 3500);
    assert.equal(report.totals.estimatedRevenue, 7600);
    assert.equal(report.totals.averageNightlyRate, 760);
    assert.ok(report.totals.occupancyPercent !== null);
  });

  it("estimates channel money with the website quote rules and ignores closed blocks", () => {
    const promotions: RoomPromotionRate[] = [
      {
        roomId: "superior",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        percentOff: 10,
      },
    ];
    const rateOverrides = new Map<string, number>([
      ["family:2026-07-10", 1200],
      ["family:2026-07-11", 1200],
    ]);

    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [],
      channelBlocks: [
        channel({
          roomId: "superior",
          startDate: "2026-07-01",
          endDate: "2026-07-03",
        }),
        channel({
          id: "c2",
          databaseId: "cdb2",
          roomId: "family",
          startDate: "2026-07-10",
          endDate: "2026-07-12",
          bookingSource: "booking",
        }),
      ],
      monthBlocks: [
        {
          id: "closed",
          databaseId: "closed-db",
          roomId: "superior",
          startDate: "2026-07-20",
          endDate: "2026-07-22",
          reason: "Maintenance",
          staffNote: "",
          guestName: "",
          guestEmail: "",
          guestPhone: "",
          bookingSource: null,
          icalFeedId: null,
          channelLabel: null,
          roomUnitId: null,
          roomNumber: null,
        },
      ],
      promotions,
      rateOverrides,
    });

    // Superior: 2 nights × 630 (10% off 700)
    assert.equal(report.rooms.find((row) => row.roomId === "superior")?.nightsSold, 2);
    assert.equal(report.rooms.find((row) => row.roomId === "superior")?.channelRevenue, 1260);
    // Family: 2 nights × day override 1200
    assert.equal(report.rooms.find((row) => row.roomId === "family")?.channelRevenue, 2400);
    assert.equal(report.totals.websiteRevenue, 0);
    assert.equal(report.totals.channelRevenue, 3660);
    assert.equal(report.totals.estimatedRevenue, 3660);
    assert.match(report.revenueNote, /website|quote|channel|payout/i);
  });

  it("falls back to quoted nights when a website stay has no saved total", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-04",
          estimatedTotal: 0,
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.rooms[0]?.websiteRevenue, 2100); // 3 × 700
    assert.equal(report.rooms[0]?.estimatedRevenue, 2100);
  });

  it("quotes only channel nights that fall inside the month", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [],
      channelBlocks: [
        channel({
          roomId: "superior",
          startDate: "2026-06-28",
          endDate: "2026-07-03",
        }),
      ],
    });

    assert.equal(report.rooms[0]?.nightsSold, 2);
    assert.equal(report.rooms[0]?.channelRevenue, 1400); // Jul 1–2 only
  });
});
