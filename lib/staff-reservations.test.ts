import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffBooking } from "./booking-requests";
import type { StaffRoomBlock } from "./room-blocks";
import {
  buildReservationRows,
  classifyWebsiteLedgerStatus,
  countLedgerStatuses,
  filterReservationRows,
  parseReservationsDateRange,
  parseReservationsLedgerFilter,
  rowMatchesLedgerFilter,
  sortReservationRows,
} from "./staff-reservations";

function websiteBooking(
  partial: Partial<StaffBooking> & Pick<StaffBooking, "id" | "guest" | "arrivalDate" | "departureDate">,
): StaffBooking {
  return {
    databaseId: partial.databaseId ?? partial.id,
    id: partial.id,
    guest: partial.guest,
    room: partial.room ?? "Family GF",
    dates: `${partial.arrivalDate} - ${partial.departureDate}`,
    nights: 1,
    status: partial.status ?? "confirmed",
    requestedAt: "Recently",
    note: "",
    contact: "g@example.com",
    phone: "",
    arrivalDate: partial.arrivalDate,
    departureDate: partial.departureDate,
    roomId: partial.roomId ?? "ground",
    estimatedTotal: partial.estimatedTotal ?? 1000,
    depositAmount: partial.depositAmount ?? 300,
    depositPaid: partial.depositPaid ?? true,
    bookingSource: partial.bookingSource ?? null,
    bankTransferClaimed: partial.bankTransferClaimed ?? false,
    stayStatus: partial.stayStatus ?? "expected",
    stayEndReason: partial.stayEndReason ?? null,
    staffNote: "",
    roomUnitId: "roomUnitId" in partial ? (partial.roomUnitId ?? null) : "unit-1",
    roomNumber: "roomNumber" in partial ? (partial.roomNumber ?? null) : "116",
    bedSetup: null,
  };
}

function channelBlock(partial: {
  id: string;
  startDate: string;
  endDate: string;
  guestName?: string;
  channelLabel?: string | null;
  bookingSource?: StaffRoomBlock["bookingSource"];
}): StaffRoomBlock {
  return {
    id: partial.id.slice(0, 8).toUpperCase(),
    databaseId: partial.id,
    roomId: "ground",
    startDate: partial.startDate,
    endDate: partial.endDate,
    reason: "Reserved",
    staffNote: "",
    guestName: partial.guestName ?? "Bo",
    guestEmail: "",
    guestPhone: "",
    bookingSource: partial.bookingSource ?? "airbnb",
    icalFeedId: null,
    channelLabel: partial.channelLabel ?? "Airbnb",
    roomUnitId: "unit-1",
    roomNumber: "116",
  };
}

describe("buildReservationRows", () => {
  it("includes website and channel stays but not closures", () => {
    const rows = buildReservationRows({
      bookings: [
        websiteBooking({
          id: "b1",
          guest: "Ada",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
        }),
      ],
      blocks: [
        channelBlock({
          id: "c1",
          startDate: "2026-08-05",
          endDate: "2026-08-07",
          guestName: "Bo",
        }),
        {
          id: "CLOSED01",
          databaseId: "closed-1",
          roomId: "ground",
          startDate: "2026-08-20",
          endDate: "2026-08-22",
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
      knownUnitIds: new Set(["unit-1"]),
      fromIso: "2026-08-01",
      toIso: "2026-08-31",
      todayIso: "2026-08-01",
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.kind).sort(),
      ["channel", "website"],
    );
  });

  it("derives checked-in status label from stay dates", () => {
    const rows = buildReservationRows({
      bookings: [
        websiteBooking({
          id: "in",
          guest: "In house",
          arrivalDate: "2026-08-01",
          departureDate: "2026-08-05",
          status: "confirmed",
        }),
      ],
      blocks: [],
      knownUnitIds: new Set(["unit-1"]),
      fromIso: "2026-08-01",
      toIso: "2026-08-31",
      todayIso: "2026-08-03",
    });
    assert.equal(rows[0]?.statusLabel, "Checked in");
  });

  it("includes only stays whose check-in falls inside the range", () => {
    const rows = buildReservationRows({
      bookings: [
        websiteBooking({
          id: "in-range",
          guest: "August arrival",
          arrivalDate: "2026-08-15",
          departureDate: "2026-09-05",
        }),
        websiteBooking({
          id: "overlap-only",
          guest: "July check-in",
          arrivalDate: "2026-07-28",
          departureDate: "2026-08-05",
        }),
      ],
      blocks: [
        channelBlock({
          id: "before",
          startDate: "2026-07-30",
          endDate: "2026-08-02",
          guestName: "Early channel",
        }),
        channelBlock({
          id: "in-range",
          startDate: "2026-08-20",
          endDate: "2026-08-22",
          guestName: "August channel",
        }),
      ],
      knownUnitIds: new Set(["unit-1"]),
      fromIso: "2026-08-01",
      toIso: "2026-08-31",
      todayIso: "2026-08-01",
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.label).sort(),
      ["August arrival", "August channel"],
    );
  });

  it("classifies declined stays as cancelled or no-show", () => {
    assert.equal(
      classifyWebsiteLedgerStatus(
        websiteBooking({
          id: "c1",
          guest: "X",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
          status: "declined",
          stayEndReason: "cancellation",
        }),
        "2026-08-01",
      ),
      "cancelled",
    );
    assert.equal(
      classifyWebsiteLedgerStatus(
        websiteBooking({
          id: "n1",
          guest: "Y",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
          status: "declined",
          stayEndReason: "no-show",
        }),
        "2026-08-01",
      ),
      "no-show",
    );
  });
});

describe("filterReservationRows", () => {
  const rows = buildReservationRows({
    bookings: [
      websiteBooking({
        id: "paid",
        guest: "Paid",
        arrivalDate: "2026-08-10",
        departureDate: "2026-08-11",
        status: "confirmed",
      }),
      websiteBooking({
        id: "hold",
        guest: "Hold",
        arrivalDate: "2026-08-08",
        departureDate: "2026-08-09",
        status: "pending_payment",
        depositPaid: false,
        roomUnitId: null,
        roomNumber: null,
      }),
      websiteBooking({
        id: "gone",
        guest: "Gone",
        arrivalDate: "2026-08-03",
        departureDate: "2026-08-04",
        status: "declined",
        stayEndReason: "no-show",
      }),
    ],
    blocks: [
      channelBlock({
        id: "chan",
        startDate: "2026-08-12",
        endDate: "2026-08-13",
        guestName: "Chan",
        bookingSource: "airbnb",
      }),
    ],
    knownUnitIds: new Set(["unit-1"]),
    fromIso: "2026-08-01",
    toIso: "2026-08-31",
    todayIso: "2026-08-01",
  });

  it("counts ledger statuses", () => {
    const counts = countLedgerStatuses(rows);
    assert.equal(counts.all, 4);
    assert.equal(counts.pending, 1);
    assert.equal(counts["no-show"], 1);
    assert.equal(counts.upcoming, 2);
  });

  it("filters by ledger status and source", () => {
    const pending = filterReservationRows(rows, { ledger: "pending" });
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.id, "hold");

    const airbnb = filterReservationRows(rows, { ledger: "all", source: "airbnb" });
    assert.equal(airbnb.length, 1);
    assert.equal(airbnb[0]?.sourceLabel, "Airbnb");
  });

  it("sorts by arrival date", () => {
    const sorted = sortReservationRows(rows);
    assert.equal(sorted[0]?.arrivalDate, "2026-08-03");
  });
});

describe("parse reservation query values", () => {
  it("accepts ledger filter and date range", () => {
    assert.equal(parseReservationsLedgerFilter("no-show"), "no-show");
    assert.equal(parseReservationsLedgerFilter("nope"), "all");
    const range = parseReservationsDateRange({
      from: "2026-08-05",
      to: "2026-08-01",
    });
    assert.equal(range.fromIso, "2026-08-01");
    assert.equal(range.toIso, "2026-08-05");
  });

  it("matches upcoming for future active stays", () => {
    const row = buildReservationRows({
      bookings: [
        websiteBooking({
          id: "f1",
          guest: "Future",
          arrivalDate: "2026-09-01",
          departureDate: "2026-09-03",
          status: "confirmed",
        }),
      ],
      blocks: [],
      knownUnitIds: new Set(["unit-1"]),
      fromIso: "2026-08-01",
      toIso: "2026-09-30",
      todayIso: "2026-08-01",
    })[0]!;

    assert.equal(rowMatchesLedgerFilter(row, "upcoming", "2026-08-01"), true);
    assert.equal(rowMatchesLedgerFilter(row, "cancelled", "2026-08-01"), false);
  });
});
