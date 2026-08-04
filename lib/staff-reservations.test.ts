import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffBooking } from "./booking-requests";
import type { StaffRoomBlock } from "./room-blocks";
import {
  buildReservationRows,
  countReservationSignals,
  filterReservationRows,
  parseReservationsAttention,
  parseReservationsKind,
  parseReservationsPayment,
  reservationNeedsAttention,
  sortReservationRows,
  type ReservationRow,
} from "./staff-reservations";

function websiteBooking(partial: Partial<StaffBooking> & Pick<StaffBooking, "id" | "guest" | "arrivalDate" | "departureDate">): StaffBooking {
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
    staffNote: "",
    roomUnitId: "roomUnitId" in partial ? (partial.roomUnitId ?? null) : "unit-1",
    roomNumber: "roomNumber" in partial ? (partial.roomNumber ?? null) : "116",
    bedSetup: null,
  };
}

function block(partial: {
  id: string;
  roomId?: string;
  startDate: string;
  endDate: string;
  icalFeedId?: string | null;
  guestName?: string;
  channelLabel?: string | null;
  reason?: string;
  roomUnitId?: string | null;
  roomNumber?: string | null;
}): StaffRoomBlock {
  return {
    id: partial.id.slice(0, 8).toUpperCase(),
    databaseId: partial.id,
    roomId: partial.roomId ?? "ground",
    startDate: partial.startDate,
    endDate: partial.endDate,
    reason: partial.reason ?? "Closed",
    staffNote: "",
    guestName: partial.guestName ?? "",
    guestEmail: "",
    guestPhone: "",
    bookingSource: null,
    icalFeedId: partial.icalFeedId === undefined ? null : partial.icalFeedId,
    channelLabel: partial.channelLabel ?? null,
    roomUnitId: partial.roomUnitId ?? null,
    roomNumber: partial.roomNumber ?? null,
  };
}

describe("buildReservationRows", () => {
  it("unifies website, channel, and closure rows", () => {
    const known = new Set(["unit-1"]);
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
        block({
          id: "c1",
          startDate: "2026-08-05",
          endDate: "2026-08-07",
          icalFeedId: "feed-1",
          guestName: "Bo",
          channelLabel: "Airbnb",
          roomUnitId: "unit-1",
          roomNumber: "116",
        }),
        block({
          id: "x1",
          startDate: "2026-08-20",
          endDate: "2026-08-22",
          reason: "Maintenance",
        }),
      ],
      knownUnitIds: known,
      monthKey: "2026-08",
      fromIso: "2026-08-01",
      toIso: "2026-08-31",
    });

    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.kind).sort(),
      ["channel", "closure", "website"],
    );
    const website = rows.find((row) => row.kind === "website");
    assert.ok(website);
    assert.match(website.href, /booking=b1/);
    assert.match(website.href, /month=2026-08/);
    const channel = rows.find((row) => row.kind === "channel");
    assert.ok(channel);
    assert.match(channel.href, /block=c1/);
    const closure = rows.find((row) => row.kind === "closure");
    assert.ok(closure);
    assert.equal(closure.label, "Maintenance");
    assert.match(closure.href, /block=x1/);
  });

  it("flags unpaid holds and missing door numbers", () => {
    const known = new Set(["unit-1"]);
    const rows = buildReservationRows({
      bookings: [
        websiteBooking({
          id: "hold",
          guest: "Hold",
          arrivalDate: "2026-08-03",
          departureDate: "2026-08-04",
          status: "pending_payment",
          depositPaid: false,
          roomUnitId: null,
          roomNumber: null,
        }),
      ],
      blocks: [],
      knownUnitIds: known,
      monthKey: "2026-08",
      fromIso: "2026-08-01",
      toIso: "2026-08-31",
    });

    assert.equal(rows[0]?.needsRoom, true);
    assert.equal(rows[0]?.isHold, true);
    assert.equal(reservationNeedsAttention(rows[0]!), true);
  });
});

describe("filterReservationRows and signals", () => {
  const known = new Set(["unit-1"]);
  const rows = buildReservationRows({
    bookings: [
      websiteBooking({
        id: "paid",
        guest: "Paid",
        arrivalDate: "2026-08-10",
        departureDate: "2026-08-11",
        status: "confirmed",
        depositPaid: true,
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
    ],
    blocks: [
      block({
        id: "close",
        startDate: "2026-08-15",
        endDate: "2026-08-16",
        reason: "Closed",
      }),
      block({
        id: "chan",
        startDate: "2026-08-12",
        endDate: "2026-08-13",
        icalFeedId: "feed",
        guestName: "Chan",
        roomUnitId: null,
      }),
    ],
    knownUnitIds: known,
    monthKey: "2026-08",
    fromIso: "2026-08-01",
    toIso: "2026-08-31",
  });

  it("counts attention signals", () => {
    const signals = countReservationSignals(rows);
    assert.equal(signals.unpaid, 1);
    assert.equal(signals.noDoor, 2);
    assert.equal(signals.closed, 1);
    assert.ok(signals.needsAttention >= 2);
  });

  it("filters by attention and kind", () => {
    const unpaid = filterReservationRows(rows, {
      attention: "unpaid",
      kind: "all",
      payment: "all",
    });
    assert.equal(unpaid.length, 1);
    assert.equal(unpaid[0]?.id, "hold");

    const closures = filterReservationRows(rows, {
      attention: "all",
      kind: "closure",
      payment: "all",
    });
    assert.equal(closures.length, 1);
    assert.equal(closures[0]?.kind, "closure");
  });

  it("sorts urgency before arrival", () => {
    const sorted = sortReservationRows(rows);
    assert.equal(sorted[0]?.isHold || sorted[0]?.needsRoom, true);
  });
});

describe("parse reservation query values", () => {
  it("accepts known attention, kind, and payment values", () => {
    assert.equal(parseReservationsAttention("unpaid"), "unpaid");
    assert.equal(parseReservationsAttention("nope"), "needs");
    assert.equal(parseReservationsKind("channel"), "channel");
    assert.equal(parseReservationsKind(""), "all");
    assert.equal(parseReservationsPayment("paid"), "paid");
  });
});

describe("reservationNeedsAttention typing", () => {
  it("does not treat type closures as needs-attention (use Closed chip)", () => {
    const row: ReservationRow = {
      id: "x",
      kind: "closure",
      label: "Closed",
      sublabel: "Family GF",
      kindLabel: "Closed",
      statusLabel: "Closed",
      arrivalDate: "2026-08-01",
      departureDate: "2026-08-02",
      datesLabel: "Aug 1-2",
      doorLabel: null,
      needsRoom: false,
      isHold: false,
      isPaid: false,
      sourceLabel: null,
      moneyLabel: null,
      urgency: 40,
      href: "/staff/calendar",
    };
    assert.equal(reservationNeedsAttention(row), false);
  });
});
