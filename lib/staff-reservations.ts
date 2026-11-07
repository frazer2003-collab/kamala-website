import {
  buildStaffCalendarHref,
  dateRangeOverlapsBooking,
  formatCalendarMonth,
  getCalendarMonthBounds,
  getTodayIso,
  parseCalendarMonth,
} from "@/lib/calendar";
import { countStayNights } from "@/lib/stay-dates";
import {
  getStaffBookingKey,
  isInventoryHoldBooking,
  type StaffBooking,
} from "@/lib/booking-requests";
import {
  formatBookingSource,
  type BookingSource,
} from "@/lib/booking-source";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import {
  getStaffRoomBlockKey,
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";
import { formatStayEndReason } from "@/lib/stay-end-reason";
import { resolveStayStatusFromDates } from "@/lib/stay-status";
import { stayNeedsRoomAssignment } from "@/lib/room-units";

export type ReservationRowKind = "website" | "channel";

export type LedgerStatus =
  | "upcoming"
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "no-show";

export type ReservationsLedgerFilter = "all" | LedgerStatus;

export type ReservationsSortKey =
  | "guest"
  | "stay"
  | "booked"
  | "room"
  | "source"
  | "payment"
  | "status";

export type ReservationsSortDir = "asc" | "desc";

export type ReservationsPayFilter =
  | "all"
  | "Paid"
  | "Unpaid"
  | "No charge"
  | "No price"
  | "Transfer to verify";

export type ReservationRow = {
  id: string;
  kind: ReservationRowKind;
  label: string;
  sublabel: string;
  statusLabel: string;
  ledgerStatus: LedgerStatus;
  arrivalDate: string;
  departureDate: string;
  checkInLabel: string;
  checkOutLabel: string;
  /** ISO date (Bangkok calendar day) when the stay was booked, if known. */
  bookedAt: string | null;
  bookedLabel: string | null;
  doorLabel: string | null;
  needsRoom: boolean;
  nights: number;
  phone: string | null;
  sourceLabel: string;
  moneyLabel: string | null;
  /** Paid, Unpaid, No charge, No price, or Transfer to verify. */
  payLabel: string;
  href: string;
};

export type LedgerStatusCounts = Record<LedgerStatus, number> & { all: number };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ROOM_SHORT_NAMES: Record<string, string> = {
  courtyard: "Superior",
  garden: "Deluxe",
  loft: "Family",
  ground: "Family GF",
};

function roomShortName(roomId: string) {
  return ROOM_SHORT_NAMES[roomId] ?? roomId;
}

function formatIsoDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Calendar day in Asia/Bangkok from a timestamptz string. */
export function bookedDateFromTimestamp(createdAt: string | null | undefined) {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function formatBookedLabel(bookedAt: string | null) {
  return bookedAt ? formatIsoDate(bookedAt) : null;
}

function calendarHrefForRange(options: {
  fromIso: string;
  toIso: string;
  booking?: string;
  block?: string;
}) {
  const monthKey = options.fromIso.slice(0, 7);
  return buildStaffCalendarHref({
    month: monthKey,
    from: options.fromIso,
    to: options.toIso,
    booking: options.booking,
    block: options.block,
  });
}

function stayNightCount(arrival: string, departure: string) {
  return countStayNights(arrival, departure) ?? 1;
}

function websitePay(booking: StaffBooking, currency?: PropertyCurrency) {
  if (!(booking.estimatedTotal > 0)) {
    return { moneyLabel: null as string | null, payLabel: "No charge" };
  }

  const moneyLabel = currency
    ? formatMoneySuffix(booking.estimatedTotal, currency)
    : null;

  if (booking.bankTransferClaimed && !booking.depositPaid) {
    return { moneyLabel, payLabel: "Transfer to verify" };
  }

  return {
    moneyLabel,
    payLabel: booking.depositPaid ? "Paid" : "Unpaid",
  };
}

function websiteSourceLabel(booking: StaffBooking) {
  if (booking.bookingSource) {
    return formatBookingSource(booking.bookingSource);
  }
  return "Website";
}

function websiteStatusLabel(booking: StaffBooking, todayIso: string = getTodayIso()) {
  if (booking.status === "declined") {
    return formatStayEndReason(booking.stayEndReason) ?? "Cancelled";
  }

  if (booking.bankTransferClaimed && !booking.depositPaid) {
    return "Transfer to verify";
  }

  if (isInventoryHoldBooking(booking)) {
    return "Awaiting payment";
  }

  if (booking.status === "needs-reply") {
    return "Needs staff reply";
  }

  if (booking.status === "awaiting") {
    return booking.depositPaid ? "Payment received" : "Awaiting";
  }

  if (booking.status === "confirmed") {
    const stayStatus = resolveStayStatusFromDates(
      booking.arrivalDate,
      booking.departureDate,
      todayIso,
    );
    if (stayStatus === "checked-in") {
      return "Checked in";
    }
    if (stayStatus === "checked-out") {
      return "Checked out";
    }
    return "Confirmed";
  }

  if (booking.status === "pending_payment") {
    return "Awaiting payment";
  }

  return "Pending";
}

export function classifyWebsiteLedgerStatus(
  booking: StaffBooking,
  todayIso: string = getTodayIso(),
): LedgerStatus {
  if (booking.status === "declined") {
    return booking.stayEndReason === "no-show" ? "no-show" : "cancelled";
  }

  if (
    isInventoryHoldBooking(booking) ||
    booking.status === "pending_payment" ||
    booking.status === "new" ||
    booking.status === "needs-reply" ||
    (booking.status === "awaiting" && !booking.depositPaid)
  ) {
    return "pending";
  }

  const stayStatus = resolveStayStatusFromDates(
    booking.arrivalDate,
    booking.departureDate,
    todayIso,
  );
  if (stayStatus === "checked-out") {
    return "completed";
  }

  if (booking.status === "confirmed" && booking.arrivalDate > todayIso) {
    return "upcoming";
  }

  if (booking.status === "confirmed") {
    return "confirmed";
  }

  if (booking.arrivalDate > todayIso) {
    return "upcoming";
  }

  return "confirmed";
}

export function classifyChannelLedgerStatus(
  block: StaffRoomBlock,
  todayIso: string = getTodayIso(),
): LedgerStatus {
  if (block.endDate <= todayIso) {
    return "completed";
  }
  if (block.startDate > todayIso) {
    return "upcoming";
  }
  return "confirmed";
}

export function buildReservationRows({
  bookings,
  blocks,
  knownUnitIds,
  fromIso,
  toIso,
  currency,
  todayIso = getTodayIso(),
}: {
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  knownUnitIds: ReadonlySet<string>;
  fromIso: string;
  toIso: string;
  currency?: PropertyCurrency;
  todayIso?: string;
}): ReservationRow[] {
  const rows: ReservationRow[] = [];

  for (const booking of bookings) {
    if (!dateRangeOverlapsBooking(booking, fromIso, toIso)) {
      continue;
    }

    const needsRoom = stayNeedsRoomAssignment(booking, knownUnitIds);
    const ledgerStatus = classifyWebsiteLedgerStatus(booking, todayIso);
    const key = getStaffBookingKey(booking);
    const pay = websitePay(booking, currency);
    const phone = booking.phone.trim();
    const bookedAt = bookedDateFromTimestamp(booking.createdAt);

    rows.push({
      id: key,
      kind: "website",
      label: booking.guest,
      sublabel: booking.room,
      statusLabel: websiteStatusLabel(booking, todayIso),
      ledgerStatus,
      arrivalDate: booking.arrivalDate,
      departureDate: booking.departureDate,
      checkInLabel: formatIsoDate(booking.arrivalDate),
      checkOutLabel: formatIsoDate(booking.departureDate),
      bookedAt,
      bookedLabel: formatBookedLabel(bookedAt),
      doorLabel: needsRoom
        ? null
        : booking.roomNumber
          ? `#${booking.roomNumber}`
          : null,
      needsRoom,
      nights: stayNightCount(booking.arrivalDate, booking.departureDate),
      phone: phone || null,
      sourceLabel: websiteSourceLabel(booking),
      moneyLabel: pay.moneyLabel,
      payLabel: pay.payLabel,
      href: calendarHrefForRange({
        fromIso,
        toIso,
        booking: key,
      }),
    });
  }

  for (const block of blocks) {
    if (!isChannelReservation(block)) {
      continue;
    }

    const stay = {
      arrivalDate: block.startDate,
      departureDate: block.endDate,
    };
    if (!dateRangeOverlapsBooking(stay, fromIso, toIso)) {
      continue;
    }

    const needsRoom = stayNeedsRoomAssignment(block, knownUnitIds);
    const ledgerStatus = classifyChannelLedgerStatus(block, todayIso);
    const key = getStaffRoomBlockKey(block);
    const label = block.guestName.trim() || block.channelLabel || "Channel guest";
    const sourceLabel =
      formatBookingSource(block.bookingSource) !== "—"
        ? formatBookingSource(block.bookingSource)
        : block.channelLabel || "Channel";
    const bookedAt = bookedDateFromTimestamp(block.createdAt);

    rows.push({
      id: key,
      kind: "channel",
      label,
      sublabel: roomShortName(block.roomId),
      statusLabel: needsRoom ? "Needs room #" : "Confirmed",
      ledgerStatus,
      arrivalDate: block.startDate,
      departureDate: block.endDate,
      checkInLabel: formatIsoDate(block.startDate),
      checkOutLabel: formatIsoDate(block.endDate),
      bookedAt,
      bookedLabel: formatBookedLabel(bookedAt),
      doorLabel: needsRoom
        ? null
        : block.roomNumber
          ? `#${block.roomNumber}`
          : null,
      needsRoom,
      nights: stayNightCount(block.startDate, block.endDate),
      phone: block.guestPhone.trim() || null,
      sourceLabel,
      moneyLabel: null,
      payLabel: "No price",
      href: calendarHrefForRange({
        fromIso,
        toIso,
        block: key,
      }),
    });
  }

  return rows;
}

export function countLedgerStatuses(rows: ReservationRow[]): LedgerStatusCounts {
  const counts: LedgerStatusCounts = {
    all: rows.length,
    upcoming: 0,
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    "no-show": 0,
  };

  for (const row of rows) {
    counts[row.ledgerStatus] += 1;
  }

  return counts;
}

export function rowMatchesLedgerFilter(
  row: ReservationRow,
  filter: ReservationsLedgerFilter,
  todayIso: string = getTodayIso(),
) {
  if (filter === "all") {
    return true;
  }

  if (filter === row.ledgerStatus) {
    return true;
  }

  if (filter === "confirmed" && row.ledgerStatus === "upcoming" && row.statusLabel === "Confirmed") {
    return true;
  }

  if (
    filter === "upcoming" &&
    row.arrivalDate >= todayIso &&
    row.ledgerStatus !== "cancelled" &&
    row.ledgerStatus !== "no-show" &&
    row.ledgerStatus !== "completed"
  ) {
    return true;
  }

  return false;
}

export function rowMatchesReservationQuery(row: ReservationRow, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const haystack = [row.label, row.sublabel, row.doorLabel, row.phone, row.sourceLabel]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function filterReservationRows(
  rows: ReservationRow[],
  filters: {
    ledger: ReservationsLedgerFilter;
    source?: BookingSource | "website" | "all";
    query?: string;
    room?: string;
    pay?: ReservationsPayFilter;
    todayIso?: string;
  },
) {
  const todayIso = filters.todayIso ?? getTodayIso();
  const query = filters.query ?? "";
  const room = (filters.room ?? "").trim().toLowerCase();
  const pay = filters.pay ?? "all";

  return rows.filter((row) => {
    if (!rowMatchesReservationQuery(row, query)) {
      return false;
    }

    if (!rowMatchesLedgerFilter(row, filters.ledger, todayIso)) {
      return false;
    }

    if (filters.source && filters.source !== "all") {
      if (filters.source === "website") {
        if (row.sourceLabel !== "Website") {
          return false;
        }
      } else if (row.sourceLabel !== formatBookingSource(filters.source)) {
        return false;
      }
    }

    if (room && row.sublabel.toLowerCase() !== room) {
      return false;
    }

    if (pay !== "all" && row.payLabel !== pay) {
      return false;
    }

    return true;
  });
}

function compareNullableIso(a: string | null, b: string | null) {
  if (a === b) {
    return 0;
  }
  if (!a) {
    return 1;
  }
  if (!b) {
    return -1;
  }
  return a.localeCompare(b);
}

function compareReservationSortValue(
  a: ReservationRow,
  b: ReservationRow,
  key: ReservationsSortKey,
) {
  switch (key) {
    case "guest":
      return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
    case "stay":
      return (
        a.arrivalDate.localeCompare(b.arrivalDate) ||
        a.departureDate.localeCompare(b.departureDate) ||
        a.label.localeCompare(b.label)
      );
    case "booked":
      return compareNullableIso(a.bookedAt, b.bookedAt) || a.label.localeCompare(b.label);
    case "room":
      return (
        a.sublabel.localeCompare(b.sublabel) ||
        (a.doorLabel ?? "").localeCompare(b.doorLabel ?? "") ||
        a.label.localeCompare(b.label)
      );
    case "source":
      return a.sourceLabel.localeCompare(b.sourceLabel) || a.label.localeCompare(b.label);
    case "payment":
      return (
        a.payLabel.localeCompare(b.payLabel) ||
        (a.moneyLabel ?? "").localeCompare(b.moneyLabel ?? "") ||
        a.label.localeCompare(b.label)
      );
    case "status":
      return (
        a.ledgerStatus.localeCompare(b.ledgerStatus) ||
        a.statusLabel.localeCompare(b.statusLabel) ||
        a.label.localeCompare(b.label)
      );
  }
}

export function sortReservationRows(
  rows: ReservationRow[],
  sort: ReservationsSortKey = "stay",
  dir: ReservationsSortDir = "asc",
) {
  const direction = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => compareReservationSortValue(a, b, sort) * direction);
}

export function parseReservationsLedgerFilter(value?: string): ReservationsLedgerFilter {
  if (
    value === "upcoming" ||
    value === "confirmed" ||
    value === "pending" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "no-show"
  ) {
    return value;
  }
  return "all";
}

export function parseReservationsSource(
  value?: string,
): BookingSource | "website" | "all" {
  if (
    value === "website" ||
    value === "walk-in" ||
    value === "airbnb" ||
    value === "expedia" ||
    value === "booking"
  ) {
    return value;
  }
  return "all";
}

export function parseReservationsDateRange(params: { from?: string; to?: string }) {
  const { year, month } = parseCalendarMonth();
  const { monthStart, monthEnd } = getCalendarMonthBounds(year, month);

  let fromIso =
    params.from && ISO_DATE.test(params.from) ? params.from : monthStart;
  let toIso = params.to && ISO_DATE.test(params.to) ? params.to : monthEnd;

  if (fromIso > toIso) {
    const swap = fromIso;
    fromIso = toIso;
    toIso = swap;
  }

  return { fromIso, toIso };
}

export function parseReservationsQuery(value?: string) {
  return (value ?? "").trim().slice(0, 80);
}

export function parseReservationsSort(value?: string): ReservationsSortKey {
  if (
    value === "guest" ||
    value === "stay" ||
    value === "booked" ||
    value === "room" ||
    value === "source" ||
    value === "payment" ||
    value === "status"
  ) {
    return value;
  }
  return "stay";
}

export function parseReservationsSortDir(value?: string): ReservationsSortDir {
  return value === "desc" ? "desc" : "asc";
}

export function parseReservationsRoomFilter(value?: string) {
  return (value ?? "").trim().slice(0, 40);
}

export function parseReservationsPayFilter(value?: string): ReservationsPayFilter {
  if (
    value === "Paid" ||
    value === "Unpaid" ||
    value === "No charge" ||
    value === "No price" ||
    value === "Transfer to verify"
  ) {
    return value;
  }
  return "all";
}

export function nextReservationsSortDir(
  currentSort: ReservationsSortKey,
  currentDir: ReservationsSortDir,
  nextSort: ReservationsSortKey,
): ReservationsSortDir {
  if (currentSort === nextSort) {
    return currentDir === "asc" ? "desc" : "asc";
  }
  return nextSort === "booked" || nextSort === "stay" ? "desc" : "asc";
}

export function reservationsListHref(options: {
  from: string;
  to: string;
  ledger?: ReservationsLedgerFilter;
  source?: BookingSource | "website" | "all";
  query?: string;
  room?: string;
  pay?: ReservationsPayFilter;
  sort?: ReservationsSortKey;
  dir?: ReservationsSortDir;
}) {
  const params = new URLSearchParams();
  params.set("from", options.from);
  params.set("to", options.to);
  if (options.ledger && options.ledger !== "all") {
    params.set("ledger", options.ledger);
  }
  if (options.source && options.source !== "all") {
    params.set("source", options.source);
  }
  const query = parseReservationsQuery(options.query);
  if (query) {
    params.set("q", query);
  }
  const room = parseReservationsRoomFilter(options.room);
  if (room) {
    params.set("room", room);
  }
  const pay = options.pay ?? "all";
  if (pay !== "all") {
    params.set("pay", pay);
  }
  const sort = options.sort ?? "stay";
  const dir = options.dir ?? "asc";
  if (sort !== "stay") {
    params.set("sort", sort);
  }
  if (dir !== "asc") {
    params.set("dir", dir);
  }
  return `/staff/reservations?${params.toString()}`;
}

export function ledgerStatusLabel(status: LedgerStatus) {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "no-show":
      return "No-show";
  }
}

export function ledgerFilterLabel(filter: ReservationsLedgerFilter) {
  if (filter === "all") {
    return "All";
  }
  return ledgerStatusLabel(filter);
}

export function reservationsRangeMonthKey(fromIso: string) {
  return formatCalendarMonth(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)),
  );
}
