import {
  buildStaffCalendarHref,
  defaultStaffTimelineSelectionRange,
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
import { stayNeedsRoomAssignment } from "@/lib/room-units";
import { STAY_STATUS_LABELS } from "@/lib/stay-status";

export type ReservationKind = "website" | "channel" | "closure";

export type ReservationsAttention =
  | "needs"
  | "unpaid"
  | "no-door"
  | "closed"
  | "all";

export type ReservationsKindFilter = "all" | ReservationKind;

export type ReservationsPaymentFilter = "all" | "paid" | "unpaid";

export type ReservationRow = {
  id: string;
  kind: ReservationKind;
  label: string;
  sublabel: string;
  kindLabel: string;
  statusLabel: string;
  arrivalDate: string;
  departureDate: string;
  datesLabel: string;
  doorLabel: string | null;
  needsRoom: boolean;
  isHold: boolean;
  isPaid: boolean;
  sourceLabel: string | null;
  moneyLabel: string | null;
  /** Lower sorts first. */
  urgency: number;
  href: string;
};

export type ReservationSignals = {
  needsAttention: number;
  unpaid: number;
  noDoor: number;
  closed: number;
  total: number;
};

function formatStayDates(arrival: string, departure: string) {
  const arrivalDate = new Date(`${arrival}T00:00:00`);
  const departureDate = new Date(`${departure}T00:00:00`);
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });

  if (
    Number.isNaN(arrivalDate.getTime()) ||
    Number.isNaN(departureDate.getTime())
  ) {
    return `${arrival} – ${departure}`;
  }

  return `${formatter.format(arrivalDate)}–${formatter.format(departureDate)}`;
}

function websiteStatusLabel(booking: StaffBooking) {
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
    return STAY_STATUS_LABELS[booking.stayStatus] ?? "Confirmed";
  }

  if (booking.status === "pending_payment") {
    return "Awaiting payment";
  }

  return "Confirmed";
}

function websiteUrgency(booking: StaffBooking, needsRoom: boolean) {
  if (isInventoryHoldBooking(booking)) {
    return 10;
  }
  if (booking.status === "needs-reply") {
    return 15;
  }
  if (needsRoom) {
    return 20;
  }
  if (booking.stayStatus === "checked-in") {
    return 30;
  }
  return 50;
}

function calendarHrefForMonth(options: {
  monthKey: string;
  fromIso: string;
  toIso: string;
  booking?: string;
  block?: string;
}) {
  return buildStaffCalendarHref({
    month: options.monthKey,
    from: options.fromIso,
    to: options.toIso,
    booking: options.booking,
    block: options.block,
  });
}

export function reservationNeedsAttention(row: ReservationRow) {
  if (row.kind === "closure") {
    return false;
  }
  return row.isHold || row.needsRoom || row.statusLabel === "Needs staff reply";
}

export function buildReservationRows({
  bookings,
  blocks,
  knownUnitIds,
  monthKey,
  fromIso,
  toIso,
  currency,
  roomShortNameById,
}: {
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  knownUnitIds: ReadonlySet<string>;
  monthKey: string;
  fromIso: string;
  toIso: string;
  currency?: PropertyCurrency;
  roomShortNameById?: Map<string, string>;
}): ReservationRow[] {
  const rows: ReservationRow[] = [];

  for (const booking of bookings) {
    const needsRoom = stayNeedsRoomAssignment(booking, knownUnitIds);
    const isHold = isInventoryHoldBooking(booking);
    const isPaid = Boolean(booking.depositPaid) && !isHold;
    const key = getStaffBookingKey(booking);
    const sourceLabel =
      booking.bookingSource == null
        ? "Website"
        : formatBookingSource(booking.bookingSource);

    rows.push({
      id: key,
      kind: "website",
      label: booking.guest,
      sublabel: booking.room,
      kindLabel: "Website",
      statusLabel: websiteStatusLabel(booking),
      arrivalDate: booking.arrivalDate,
      departureDate: booking.departureDate,
      datesLabel: formatStayDates(booking.arrivalDate, booking.departureDate),
      doorLabel: needsRoom
        ? null
        : booking.roomNumber
          ? `#${booking.roomNumber}`
          : null,
      needsRoom,
      isHold,
      isPaid,
      sourceLabel,
      moneyLabel:
        currency && booking.estimatedTotal > 0
          ? formatMoneySuffix(booking.estimatedTotal, currency)
          : null,
      urgency: websiteUrgency(booking, needsRoom),
      href: calendarHrefForMonth({
        monthKey,
        fromIso,
        toIso,
        booking: key,
      }),
    });
  }

  for (const item of blocks) {
    const key = getStaffRoomBlockKey(item);
    if (isChannelReservation(item)) {
      const needsRoom = stayNeedsRoomAssignment(item, knownUnitIds);
      const label = item.guestName.trim() || item.channelLabel || "Channel guest";
      const sourceLabel =
        formatBookingSource(item.bookingSource) !== "—"
          ? formatBookingSource(item.bookingSource)
          : item.channelLabel || "Channel";

      rows.push({
        id: key,
        kind: "channel",
        label,
        sublabel: item.channelLabel || "Channel",
        kindLabel: "Channel",
        statusLabel: needsRoom ? "Needs room #" : "Channel stay",
        arrivalDate: item.startDate,
        departureDate: item.endDate,
        datesLabel: formatStayDates(item.startDate, item.endDate),
        doorLabel: needsRoom
          ? null
          : item.roomNumber
            ? `#${item.roomNumber}`
            : null,
        needsRoom,
        isHold: false,
        isPaid: true,
        sourceLabel,
        moneyLabel: null,
        urgency: needsRoom ? 20 : 55,
        href: calendarHrefForMonth({
          monthKey,
          fromIso,
          toIso,
          block: key,
        }),
      });
      continue;
    }

    rows.push({
      id: key,
      kind: "closure",
      label: item.reason.trim() || "Closed",
      sublabel: roomShortNameById?.get(item.roomId) ?? "Type closed",
      kindLabel: "Closed",
      statusLabel: "Closed",
      arrivalDate: item.startDate,
      departureDate: item.endDate,
      datesLabel: formatStayDates(item.startDate, item.endDate),
      doorLabel: null,
      needsRoom: false,
      isHold: false,
      isPaid: false,
      sourceLabel: null,
      moneyLabel: null,
      urgency: 40,
      href: calendarHrefForMonth({
        monthKey,
        fromIso,
        toIso,
        block: key,
      }),
    });
  }

  return rows;
}

export function countReservationSignals(rows: ReservationRow[]): ReservationSignals {
  let unpaid = 0;
  let noDoor = 0;
  let closed = 0;
  let needsAttention = 0;

  for (const row of rows) {
    if (row.isHold) {
      unpaid += 1;
    }
    if (row.needsRoom) {
      noDoor += 1;
    }
    if (row.kind === "closure") {
      closed += 1;
    }
    if (reservationNeedsAttention(row)) {
      needsAttention += 1;
    }
  }

  return {
    needsAttention,
    unpaid,
    noDoor,
    closed,
    total: rows.length,
  };
}

export function filterReservationRows(
  rows: ReservationRow[],
  filters: {
    attention: ReservationsAttention;
    kind: ReservationsKindFilter;
    payment: ReservationsPaymentFilter;
    source?: BookingSource | "website" | "all";
  },
) {
  return rows.filter((row) => {
    if (filters.kind !== "all" && row.kind !== filters.kind) {
      return false;
    }

    if (filters.attention === "needs" && !reservationNeedsAttention(row)) {
      return false;
    }
    if (filters.attention === "unpaid" && !row.isHold) {
      return false;
    }
    if (filters.attention === "no-door" && !row.needsRoom) {
      return false;
    }
    if (filters.attention === "closed" && row.kind !== "closure") {
      return false;
    }

    if (filters.payment === "paid") {
      if (row.kind === "closure" || !row.isPaid) {
        return false;
      }
    }
    if (filters.payment === "unpaid") {
      if (!row.isHold) {
        return false;
      }
    }

    if (filters.source && filters.source !== "all") {
      if (filters.source === "website") {
        if (row.kind !== "website" || row.sourceLabel !== "Website") {
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
    if (a.urgency !== b.urgency) {
      return a.urgency - b.urgency;
    }
    if (a.arrivalDate !== b.arrivalDate) {
      return a.arrivalDate.localeCompare(b.arrivalDate);
    }
    return a.label.localeCompare(b.label);
  });
}

export function parseReservationsAttention(value?: string): ReservationsAttention {
  if (
    value === "unpaid" ||
    value === "no-door" ||
    value === "closed" ||
    value === "all" ||
    value === "needs"
  ) {
    return value;
  }
  return "needs";
}

export function parseReservationsKind(value?: string): ReservationsKindFilter {
  if (value === "website" || value === "channel" || value === "closure") {
    return value;
  }
  return "all";
}

export function parseReservationsPayment(value?: string): ReservationsPaymentFilter {
  if (value === "paid" || value === "unpaid") {
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

export function reservationsListHref(options: {
  month: string;
  attention?: ReservationsAttention;
  kind?: ReservationsKindFilter;
  payment?: ReservationsPaymentFilter;
  source?: BookingSource | "website" | "all";
}) {
  const params = new URLSearchParams();
  params.set("month", options.month);
  if (options.attention && options.attention !== "needs") {
    params.set("attention", options.attention);
  }
  if (options.kind && options.kind !== "all") {
    params.set("kind", options.kind);
  }
  if (options.payment && options.payment !== "all") {
    params.set("payment", options.payment);
  }
  if (options.source && options.source !== "all") {
    params.set("source", options.source);
  }
  return `/staff/reservations?${params.toString()}`;
}

export function reservationsMonthSelection(monthKey: string) {
  return defaultStaffTimelineSelectionRange(monthKey);
}
