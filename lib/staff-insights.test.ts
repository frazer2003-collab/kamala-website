import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStaffInsightsReport,
  countNightsInMonth,
  describeRoomPriceChoice,
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
    stripePaymentIntentId: null,
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
    assert.equal(report.rooms[0]?.channelRevenue, 0);
    assert.equal(report.rooms[0]?.unpricedNights, 5);
    assert.equal(report.rooms[0]?.estimatedRevenue, 1400);
    assert.equal(report.rooms[1]?.roomId, "family");
    assert.equal(report.rooms[1]?.nightsSold, 3);
    assert.equal(report.rooms[1]?.websiteRevenue, 2700);
    assert.equal(report.rooms[1]?.channelRevenue, 0);
    assert.equal(report.totals.nightsSold, 10);
    assert.equal(report.totals.stayCount, 3);
    assert.equal(report.totals.websiteRevenue, 4100);
    assert.equal(report.totals.channelRevenue, 0);
    assert.equal(report.totals.unpricedNights, 5);
    assert.equal(report.totals.estimatedRevenue, 4100);
    assert.equal(report.totals.earnedRevenue, 4100);
    assert.equal(report.totals.averageNightlyRate, 820);
    // July = 31 days; Superior ×2 doors, Family ×1.
    assert.equal(report.rooms[0]?.nightsAvailable, 62);
    assert.equal(report.rooms[0]?.soldPercent, Math.round((7 / 62) * 100));
    assert.equal(report.rooms[0]?.nightsOverCapacity, 0);
    assert.equal(report.rooms[1]?.nightsAvailable, 31);
    assert.equal(report.rooms[1]?.soldPercent, Math.round((3 / 31) * 100));
    assert.equal(report.totals.nightsAvailable, 93);
    assert.equal(report.totals.soldPercent, Math.round((10 / 93) * 100));
  });

  it("prorates website stay totals to nights inside the range", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-06-28",
          departureDate: "2026-07-03",
          estimatedTotal: 3500, // 5 × 700
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.rooms[0]?.nightsSold, 2);
    assert.equal(report.rooms[0]?.websiteRevenue, 1400); // 3500 × 2/5
    assert.equal(report.totals.averageNightlyRate, 700);
  });

  it("reduces capacity for staff-closed nights", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-07-01",
      toIso: "2026-07-10",
      rooms: [rooms[0]!],
      bookings: [],
      channelBlocks: [],
      monthBlocks: [
        {
          id: "closed",
          databaseId: "closed-db",
          roomId: "superior",
          startDate: "2026-07-01",
          endDate: "2026-07-06",
          reason: "Paint",
          staffNote: "",
          guestName: "",
          guestEmail: "",
          guestPhone: "",
          bookingSource: null,
          channelLabel: null,
          roomUnitId: null,
          roomNumber: null,
        },
      ],
    });

    // 10 days − 5 closed = 5 open × 2 doors = 10
    assert.equal(report.rooms[0]?.nightsAvailable, 10);
  });

  it("caps sold percent and reports nights over capacity", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-07-01",
      toIso: "2026-07-03",
      rooms: [
        {
          ...rooms[1]!,
          availableCount: 1,
        },
      ],
      bookings: [
        booking({
          id: "a",
          databaseId: "da",
          roomId: "family",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-03",
          estimatedTotal: 1800,
        }),
        booking({
          id: "b",
          databaseId: "db",
          roomId: "family",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-03",
          estimatedTotal: 1800,
        }),
      ],
      channelBlocks: [],
    });

    // Capacity 3 door-nights; 4 sold nights
    assert.equal(report.rooms[0]?.nightsAvailable, 3);
    assert.equal(report.rooms[0]?.nightsSold, 4);
    assert.equal(report.rooms[0]?.soldPercent, 100);
    assert.equal(report.rooms[0]?.nightsOverCapacity, 1);
  });

  it("leaves channel nights out of the money when no price was saved", () => {
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
          channelLabel: null,
          roomUnitId: null,
          roomNumber: null,
        },
      ],
      promotions,
      rateOverrides,
    });

    assert.equal(report.rooms.find((row) => row.roomId === "superior")?.nightsSold, 2);
    assert.equal(report.rooms.find((row) => row.roomId === "superior")?.channelRevenue, 0);
    assert.equal(report.rooms.find((row) => row.roomId === "superior")?.unpricedNights, 2);
    assert.equal(report.rooms.find((row) => row.roomId === "family")?.unpricedNights, 2);
    assert.equal(report.totals.websiteRevenue, 0);
    assert.equal(report.totals.channelRevenue, 0);
    assert.equal(report.totals.estimatedRevenue, 0);
    assert.equal(report.totals.unpricedNights, 4);
    assert.match(report.revenueNote, /channel|saved price/i);
  });

  it("honours a stay saved at zero instead of charging the rack rate", () => {
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

    assert.equal(report.rooms[0]?.nightsSold, 3);
    assert.equal(report.rooms[0]?.websiteRevenue, 0);
    assert.equal(report.rooms[0]?.estimatedRevenue, 0);
    assert.equal(report.rooms[0]?.recordedStayCount, 1);
    assert.equal(report.totals.estimatedRevenue, 0);
    assert.equal(report.totals.recordedStayCount, 1);
    assert.equal(report.totals.averageNightlyRate, 0);
  });

  it("uses the entered price even when it undercuts the room's rate", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-03",
          estimatedTotal: 1000, // rack rate would be 2 × 700 = 1400
          bookingSource: "walk-in",
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.rooms[0]?.websiteRevenue, 1000);
    assert.equal(report.totals.averageNightlyRate, 500);
  });

  it("ignores day overrides and promotions for stays that carry a total", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-10",
          departureDate: "2026-07-12",
          estimatedTotal: 1500,
        }),
      ],
      channelBlocks: [],
      promotions: [
        {
          roomId: "superior",
          startDate: "2026-07-01",
          endDate: "2026-07-31",
          percentOff: 50,
        },
      ],
      rateOverrides: new Map([
        ["superior:2026-07-10", 9999],
        ["superior:2026-07-11", 9999],
      ]),
    });

    assert.equal(report.rooms[0]?.websiteRevenue, 1500);
  });

  it("keeps money from stays whose room type was removed from settings", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "retired-suite",
          room: "Garden Suite",
          arrivalDate: "2026-07-05",
          departureDate: "2026-07-08",
          estimatedTotal: 3000,
        }),
      ],
      channelBlocks: [],
    });

    const retired = report.rooms.find((row) => row.roomId === "retired-suite");
    assert.equal(retired?.roomName, "Garden Suite");
    assert.equal(retired?.isUnconfigured, true);
    assert.equal(retired?.nightsSold, 3);
    assert.equal(retired?.estimatedRevenue, 3000);
    // Capacity is unknowable once the room type is gone.
    assert.equal(retired?.nightsAvailable, 0);
    assert.equal(retired?.soldPercent, null);
    assert.equal(report.totals.estimatedRevenue, 3000);
    assert.equal(report.totals.nightsSold, 3);
    assert.equal(report.rooms.filter((row) => row.isUnconfigured).length, 1);
    // Its nights earn money but do not count against sellable capacity.
    assert.equal(report.totals.nightsSoldInCapacity, 0);
    assert.equal(report.totals.nightsOverCapacity, 0);
    assert.equal(report.totals.soldPercent, 0);
  });

  it("leaves removed room types out when their stays miss the range", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "retired-suite",
          room: "Garden Suite",
          arrivalDate: "2026-05-05",
          departureDate: "2026-05-08",
          estimatedTotal: 3000,
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.rooms.some((row) => row.isUnconfigured), false);
    assert.equal(report.totals.estimatedRevenue, 0);
  });

  it("counts only the channel nights that fall inside the month", () => {
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
    assert.equal(report.rooms[0]?.channelRevenue, 0);
    assert.equal(report.rooms[0]?.unpricedNights, 2);
  });

  it("keeps the card bank charge beside the room price", () => {
    const report = buildStaffInsightsReport({
      year: 2026,
      month: 7,
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-03",
          estimatedTotal: 2380,
          depositPaid: true,
          stripePaymentIntentId: "pi_test",
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.totals.websiteRevenue, 2380);
    assert.equal(report.totals.bankCharge, 143);
    assert.equal(report.totals.earnedRevenue, 2523);
    assert.equal(report.totals.averageNightlyRate, 1190);
  });

  it("holds back nights in the range that have not happened yet", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-07-01",
      toIso: "2026-07-04",
      todayIso: "2026-07-02",
      rooms,
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-07-01",
          departureDate: "2026-07-05",
          estimatedTotal: 4000,
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.totals.websiteRevenue, 4000);
    assert.equal(report.totals.earnedRevenue, 2000);
    assert.equal(report.totals.unearnedRevenue, 2000);
  });

  it("counts still-open nights only from today forward", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-10-01",
      toIso: "2026-10-03",
      todayIso: "2026-10-03",
      rooms: [{ ...rooms[0]!, availableCount: 2 }],
      bookings: [],
      channelBlocks: [],
    });

    assert.equal(report.totals.nightsAvailable, 6);
    assert.equal(report.totals.nightsStillOpen, 2);
    assert.equal(report.totals.nightsPassedUnsold, 4);
    assert.equal(report.rooms[0]?.nightsStillOpen, 2);
  });

  it("separates money already collected from money still owed", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-10-01",
      toIso: "2026-10-04",
      todayIso: "2026-10-03",
      rooms: [{ ...rooms[0]!, availableCount: 1 }],
      bookings: [
        booking({
          id: "paid-ahead",
          roomId: "superior",
          arrivalDate: "2026-10-04",
          departureDate: "2026-10-05",
          estimatedTotal: 700,
          depositPaid: true,
        }),
        booking({
          id: "unpaid-stayed",
          databaseId: "db-unpaid",
          guest: "Unpaid guest",
          roomId: "superior",
          arrivalDate: "2026-10-01",
          departureDate: "2026-10-02",
          estimatedTotal: 500,
          depositPaid: false,
          depositAmount: 500,
          bankTransferClaimed: true,
          refundDue: 0,
        }),
        booking({
          id: "refund-owed",
          databaseId: "db-refund",
          roomId: "superior",
          arrivalDate: "2026-10-02",
          departureDate: "2026-10-03",
          estimatedTotal: 700,
          depositPaid: true,
          refundDue: 200,
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.accounts.collected, 1400);
    assert.equal(report.accounts.collectedEarned, 700);
    assert.equal(report.accounts.collectedAhead, 700);
    assert.equal(report.accounts.unpaid, 500);
    assert.equal(report.accounts.unpaidEarned, 500);
    assert.equal(report.accounts.bankClaimedUnpaid, 500);
    assert.equal(report.accounts.refundsToSend, 200);
    assert.deepEqual(
      report.attention.map((item) => item.kind),
      ["bank-claimed", "refund"],
    );
    assert.equal(report.attention[0]?.guestName, "Unpaid guest");
    assert.equal(report.attention[1]?.amount, 200);
  });

  it("tells the owner when a discount is already in the agreed rate", () => {
    const report = buildStaffInsightsReport({
      fromIso: "2026-10-03",
      toIso: "2026-10-04",
      todayIso: "2026-10-03",
      rooms: [{ ...rooms[0]!, availableCount: 1, rate: 700 }],
      bookings: [
        booking({
          roomId: "superior",
          arrivalDate: "2026-10-03",
          departureDate: "2026-10-04",
          estimatedTotal: 500,
          depositPaid: true,
        }),
      ],
      channelBlocks: [],
    });

    assert.equal(report.rooms[0]?.agreedNightlyRate, 500);
    assert.equal(report.rooms[0]?.publishedRate, 700);
    assert.equal(report.rooms[0]?.nightsStillOpen, 1);
    assert.match(report.rooms[0]?.priceCue ?? "", /under the published rate/i);
  });
});

describe("describeRoomPriceChoice", () => {
  it("points a full-price room with empty nights at a short discount", () => {
    assert.match(
      describeRoomPriceChoice({
        publishedRate: 700,
        agreedNightlyRate: 700,
        nightsStillOpen: 4,
        pricedNights: 2,
        datesHavePassed: false,
      }),
      /short discount/i,
    );
  });

  it("does not suggest a discount after the dates have passed", () => {
    assert.match(
      describeRoomPriceChoice({
        publishedRate: 700,
        agreedNightlyRate: 500,
        nightsStillOpen: 0,
        pricedNights: 2,
        datesHavePassed: true,
      }),
      /dates have passed/i,
    );
  });
});
