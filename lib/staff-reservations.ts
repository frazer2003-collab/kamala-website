import {
  buildStaffCalendarHref,
  dateRangeOverlapsBooking,
  formatCalendarMonth,
  getCalendarMonthBounds,
  getTodayIso,
  parseCalendarMonth,
} from "@/lib/calendar";
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
  bookedLabel: string | null;
  doorLabel: string | null;
  needsRoom: boolean;
  sourceLabel: string;
  moneyLabel: string | null;
  href: string;
};

export type LedgerStatusCounts = Record<LedgerStatus, number> & { all: number };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function websiteSourceLabel(booking: StaffBooking) {
  if (booking.bookingSource) {
    return formatBookingSource(booking.bookingSource);
  }
  return "Website";
}

function websiteStatusLabel(booking: StaffBooking) {
  if (booking.status === "declined") {
    return formatStayEndReason(booking.stayEndReason) ?? "Cancelled";
  }

  if (isInventoryHoldBooking(booking)) {
    if (booking.bankTransferClaimed && !booking.depositPaid) {
      return "Transfer to verify";
    }
    return "Awaiting payment";
  }

  if (booking.status === "needs-reply") {
    return "Needs staff reply";
  }

  if (booking.status === "awaiting") {
    return booking.depositPaid ? "Payment received" : "Awaiting";
  }

  if (booking.status === "confirmed") {
    if (booking.stayStatus === "checked-in") {
      return "Checked in";
    }
    if (booking.stayStatus === "checked-out") {
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

  if (booking.stayStatus === "checked-out" || booking.departureDate <= todayIso) {
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

    rows.push({
      id: key,
      kind: "website",
      label: booking.guest,
      sublabel: booking.room,
      statusLabel: websiteStatusLabel(booking),
      ledgerStatus,
      arrivalDate: booking.arrivalDate,
      departureDate: booking.departureDate,
      checkInLabel: formatIsoDate(booking.arrivalDate),
      checkOutLabel: formatIsoDate(booking.departureDate),
      bookedLabel: booking.requestedAt === "Recently" ? null : booking.requestedAt,
      doorLabel: needsRoom
        ? null
        : booking.roomNumber
          ? `#${booking.roomNumber}`
          : null,
      needsRoom,
      sourceLabel: websiteSourceLabel(booking),
      moneyLabel:
        currency && booking.estimatedTotal > 0
          ? formatMoneySuffix(booking.estimatedTotal, currency)
          : null,
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

    rows.push({
      id: key,
      kind: "channel",
      label,
      sublabel: block.channelLabel || "Channel",
      statusLabel: needsRoom ? "Needs room #" : "Confirmed",
      ledgerStatus,
      arrivalDate: block.startDate,
      departureDate: block.endDate,
      checkInLabel: formatIsoDate(block.startDate),
      checkOutLabel: formatIsoDate(block.endDate),
      bookedLabel: null,
      doorLabel: needsRoom
        ? null
        : block.roomNumber
          ? `#${block.roomNumber}`
          : null,
      needsRoom,
      sourceLabel,
      moneyLabel: null,
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

export function filterReservationRows(
  rows: ReservationRow[],
  filters: {
    ledger: ReservationsLedgerFilter;
    source?: BookingSource | "website" | "all";
    todayIso?: string;
  },
) {
  const todayIso = filters.todayIso ?? getTodayIso();

  return rows.filter((row) => {
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

    return true;
  });
}

export function sortReservationRows(rows: ReservationRow[]) {
  return [...rows].sort((a, b) => {
    if (a.arrivalDate !== b.arrivalDate) {
      return a.arrivalDate.localeCompare(b.arrivalDate);
    }
    return a.label.localeCompare(b.label);
  });
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

export function reservationsListHref(options: {
  from: string;
  to: string;
  ledger?: ReservationsLedgerFilter;
  source?: BookingSource | "website" | "all";
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
