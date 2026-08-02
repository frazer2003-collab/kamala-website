import {
  bookingOccupiesDay,
  getTodayIso,
  type CalendarDay,
} from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import {
  getStaffBookingKey,
  isInventoryHoldBooking,
} from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import { getStaffRoomBlockKey, isChannelReservation } from "@/lib/room-blocks";
import { normalizeGuestColorKey } from "@/lib/booking-bar-colors";
import {
  getKnownUnitIdSet,
  stayNeedsRoomAssignment,
  type RoomUnit,
} from "@/lib/room-units";

function inventoryHoldLabel(booking: StaffBooking) {
  if (!isInventoryHoldBooking(booking)) {
    return null;
  }

  if (booking.status === "pending_payment") {
    return "Awaiting payment";
  }

  if (booking.bankTransferClaimed && !booking.depositPaid) {
    return "Bank transfer hold";
  }

  return "Payment hold";
}

export type TimelineBarRange = {
  startCol: number;
  span: number;
  /** Fraction of the first grid cell left empty (0 or 0.5). */
  startInset: number;
  /** Fraction of the last grid cell left empty (0 or 0.5). */
  endInset: number;
  continuesLeft: boolean;
  continuesRight: boolean;
};

export type TimelineBar = {
  key: string;
  itemKey: string;
  kind: "booking" | "block" | "channel";
  label: string;
  sublabel: string;
  /** Normalized guest name used for stable bar coloring. */
  colorKey: string;
  startCol: number;
  span: number;
  startInset: number;
  endInset: number;
  lane: number;
  showLabel: boolean;
  compact: boolean;
  continuesLeft: boolean;
  continuesRight: boolean;
  /** Waiting for staff to assign a physical room number. */
  needsRoom?: boolean;
};

/** Left edge of a stay bar in 0-based day fractions (check-in noon = n + 0.5). */
export function timelineBarStartEdge(
  bar: Pick<TimelineBarRange, "startCol" | "startInset">,
) {
  return bar.startCol - 1 + bar.startInset;
}

/** Right edge of a stay bar in 0-based day fractions (checkout noon = n + 0.5). */
export function timelineBarEndEdge(
  bar: Pick<TimelineBarRange, "startCol" | "span" | "endInset">,
) {
  return bar.startCol - 1 + bar.span - bar.endInset;
}

export function timelineBarVisualSpan(
  bar: Pick<TimelineBarRange, "span" | "startInset" | "endInset">,
) {
  return bar.span - bar.startInset - bar.endInset;
}

/** CSS grid placement with mid-cell check-in / checkout insets. */
export function getTimelineBarPlacementStyle(
  bar: Pick<TimelineBarRange, "startCol" | "span" | "startInset" | "endInset"> & {
    lane: number;
  },
) {
  const visual = Math.max(timelineBarVisualSpan(bar), 0);
  const widthPct = bar.span > 0 ? (visual / bar.span) * 100 : 100;
  const startPct = bar.span > 0 ? (bar.startInset / bar.span) * 100 : 0;

  return {
    gridColumn: `${bar.startCol} / span ${bar.span}`,
    ["--lane" as string]: bar.lane,
    width: `${widthPct}%`,
    marginInlineStart: `${startPct}%`,
  };
}

/**
 * Night columns a stay occupies for empty-day actions (arrival through last night).
 * Departure-day morning halves do not block the afternoon cell action.
 */
export function timelineBarNightColumns(
  bar: Pick<TimelineBarRange, "startCol" | "span" | "endInset">,
) {
  const lastNightCol =
    bar.endInset > 0 ? bar.startCol + bar.span - 2 : bar.startCol + bar.span - 1;
  const columns: number[] = [];

  for (let column = bar.startCol; column <= lastNightCol; column += 1) {
    columns.push(column);
  }

  return columns;
}

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Stay bars run mid check-in cell → mid departure cell (hotel noon turnover).
 * When clipped at the board edge, the open side fills the cell (no inset).
 */
export function getClippedBarRange(
  arrival: string,
  departure: string,
  calendarDays: CalendarDay[],
): TimelineBarRange | null {
  const firstIso = calendarDays[0]?.iso;
  const lastIso = calendarDays[calendarDays.length - 1]?.iso;

  if (!firstIso || !lastIso || departure < firstIso || arrival > lastIso || arrival >= departure) {
    return null;
  }

  const visibleStart = arrival < firstIso ? firstIso : arrival;
  const visibleEnd = departure > lastIso ? lastIso : departure;

  if (visibleStart > visibleEnd) {
    return null;
  }

  const startIdx = calendarDays.findIndex((day) => day.iso === visibleStart);
  const endIdx = calendarDays.findIndex((day) => day.iso === visibleEnd);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  const continuesLeft = arrival < firstIso;
  const continuesRight = departure > addIsoDays(lastIso, 1);

  return {
    startCol: startIdx + 1,
    span: endIdx - startIdx + 1,
    startInset: continuesLeft ? 0 : 0.5,
    endInset: departure > lastIso ? 0 : 0.5,
    continuesLeft,
    continuesRight,
  };
}

function rangesOverlap(a: TimelineBarRange, b: TimelineBarRange) {
  return (
    timelineBarStartEdge(a) < timelineBarEndEdge(b) &&
    timelineBarStartEdge(b) < timelineBarEndEdge(a)
  );
}

function assignTimelineLanes(bars: Omit<TimelineBar, "lane">[]): TimelineBar[] {
  const sorted = [...bars].sort((left, right) => {
    const startDelta = timelineBarStartEdge(left) - timelineBarStartEdge(right);
    if (startDelta !== 0) {
      return startDelta;
    }

    return timelineBarVisualSpan(right) - timelineBarVisualSpan(left);
  });
  const lanes: TimelineBarRange[] = [];
  const placed: TimelineBar[] = [];

  for (const bar of sorted) {
    let lane = 0;

    while (lane < lanes.length && rangesOverlap(bar, lanes[lane])) {
      lane += 1;
    }

    lanes[lane] = {
      startCol: bar.startCol,
      span: bar.span,
      startInset: bar.startInset,
      endInset: bar.endInset,
      continuesLeft: bar.continuesLeft,
      continuesRight: bar.continuesRight,
    };
    placed.push({ ...bar, lane });
  }

  return placed;
}

function isCompactBar(range: TimelineBarRange) {
  return timelineBarVisualSpan(range) < 2;
}

export function buildRoomTimelineBars({
  bookings,
  channelReservations = [],
  calendarDays,
  units = [],
  /** When true, only stays without a known door number. */
  unassignedOnly = false,
}: {
  bookings: StaffBooking[];
  channelReservations?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  /** Used to treat orphaned room_unit_id values as unassigned. */
  units?: RoomUnit[];
  unassignedOnly?: boolean;
}): TimelineBar[] {
  const bars: Omit<TimelineBar, "lane">[] = [];
  const knownUnitIds = getKnownUnitIdSet(units);
  const visibleBookings = unassignedOnly
    ? bookings.filter((booking) => stayNeedsRoomAssignment(booking, knownUnitIds))
    : bookings;
  const visibleChannels = unassignedOnly
    ? channelReservations.filter((reservation) =>
        stayNeedsRoomAssignment(reservation, knownUnitIds),
      )
    : channelReservations;

  for (const booking of visibleBookings) {
    const range = getClippedBarRange(
      booking.arrivalDate,
      booking.departureDate,
      calendarDays,
    );

    if (!range) {
      continue;
    }

    const needsRoom = stayNeedsRoomAssignment(booking, knownUnitIds);
    const hold = inventoryHoldLabel(booking);
    bars.push({
      key: `booking-${getStaffBookingKey(booking)}-${range.startCol}`,
      itemKey: getStaffBookingKey(booking),
      kind: "booking",
      label: booking.guest,
      sublabel: needsRoom
        ? hold
          ? `Needs room # · ${hold}`
          : "Needs room #"
        : hold
          ? hold
          : booking.roomNumber
            ? `Room ${booking.roomNumber}`
            : "Direct",
      colorKey: normalizeGuestColorKey(booking.guest),
      showLabel: true,
      compact: isCompactBar(range),
      needsRoom: needsRoom || Boolean(hold),
      ...range,
    });
  }

  for (const reservation of visibleChannels) {
    const range = getClippedBarRange(
      reservation.startDate,
      reservation.endDate,
      calendarDays,
    );

    if (!range) {
      continue;
    }

    const channel = reservation.channelLabel ?? "Channel";
    const needsRoom = stayNeedsRoomAssignment(reservation, knownUnitIds);
    const label = reservation.guestName.trim() || channel;

    bars.push({
      key: `channel-${getStaffRoomBlockKey(reservation)}-${range.startCol}`,
      itemKey: getStaffRoomBlockKey(reservation),
      kind: "channel",
      label,
      sublabel: needsRoom
        ? "Needs room #"
        : reservation.roomNumber
          ? `Room ${reservation.roomNumber}`
          : channel,
      colorKey: normalizeGuestColorKey(label),
      showLabel: true,
      compact: isCompactBar(range),
      needsRoom,
      ...range,
    });
  }

  return assignTimelineLanes(bars);
}

/**
 * Door-row bars: guest (or channel) name only. Room type lives in stay details.
 */
export function buildUnitTimelineBars({
  bookings,
  channelReservations = [],
  calendarDays,
}: {
  bookings: StaffBooking[];
  channelReservations?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  /** @deprecated Type no longer shown on door bars; ignored when passed. */
  roomShortNameById?: Map<string, string>;
  /** @deprecated Type no longer shown on door bars; ignored when passed. */
  currentRoomId?: string;
}): TimelineBar[] {
  const bars: Omit<TimelineBar, "lane">[] = [];

  for (const booking of bookings) {
    const range = getClippedBarRange(
      booking.arrivalDate,
      booking.departureDate,
      calendarDays,
    );

    if (!range) {
      continue;
    }

    const hold = inventoryHoldLabel(booking);
    bars.push({
      key: `unit-booking-${getStaffBookingKey(booking)}-${range.startCol}`,
      itemKey: getStaffBookingKey(booking),
      kind: "booking",
      label: booking.guest,
      sublabel: hold ?? "",
      colorKey: normalizeGuestColorKey(booking.guest),
      showLabel: true,
      compact: isCompactBar(range),
      needsRoom: Boolean(hold),
      ...range,
    });
  }

  for (const reservation of channelReservations) {
    const range = getClippedBarRange(
      reservation.startDate,
      reservation.endDate,
      calendarDays,
    );

    if (!range) {
      continue;
    }

    const channel = reservation.channelLabel ?? "Channel";
    const label = reservation.guestName.trim() || channel;

    bars.push({
      key: `unit-channel-${getStaffRoomBlockKey(reservation)}-${range.startCol}`,
      itemKey: getStaffRoomBlockKey(reservation),
      kind: "channel",
      label,
      sublabel: reservation.guestName.trim() ? channel : "",
      colorKey: normalizeGuestColorKey(label),
      showLabel: true,
      compact: isCompactBar(range),
      ...range,
    });
  }

  return assignTimelineLanes(bars);
}

export function getTimelineLaneCount(bars: TimelineBar[]) {
  if (bars.length === 0) {
    return 1;
  }

  return Math.max(...bars.map((bar) => bar.lane)) + 1;
}

export function stayAffectsRoomInventory(
  stay: { roomId: string; roomUnitId?: string | null },
  roomId: string,
  typeUnitIds: ReadonlySet<string>,
) {
  if (stay.roomId === roomId) {
    return true;
  }

  return Boolean(stay.roomUnitId && typeUnitIds.has(stay.roomUnitId));
}

/** Nights booked against a room type — by type label or any of its door numbers. */
export function countNetBookedForRoomDay({
  roomId,
  iso,
  bookings,
  channelBlocks,
  typeUnitIds,
}: {
  roomId: string;
  iso: string;
  bookings: Array<{
    roomId: string;
    roomUnitId?: string | null;
    arrivalDate: string;
    departureDate: string;
  }>;
  channelBlocks: Array<{
    roomId: string;
    roomUnitId?: string | null;
    startDate: string;
    endDate: string;
  }>;
  typeUnitIds: ReadonlySet<string>;
}) {
  let count = 0;

  for (const booking of bookings) {
    if (!stayAffectsRoomInventory(booking, roomId, typeUnitIds)) {
      continue;
    }

    if (booking.arrivalDate <= iso && booking.departureDate > iso) {
      count += 1;
    }
  }

  for (const block of channelBlocks) {
    if (!stayAffectsRoomInventory(block, roomId, typeUnitIds)) {
      continue;
    }

    if (block.startDate <= iso && block.endDate > iso) {
      count += 1;
    }
  }

  return count;
}

export type CalendarMonthStats = {
  currentGuests: number;
  arriving: number;
  departed: number;
  occupancyPercent: number;
  bookedNights: number;
  availableNights: number;
};

export function getCalendarMonthStats({
  bookings,
  blocks = [],
  calendarDays,
  rooms,
  todayIso = getTodayIso(),
}: {
  bookings: StaffBooking[];
  blocks?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  rooms: Room[];
  /** Injected for tests; defaults to property-local today. */
  todayIso?: string;
}): CalendarMonthStats {
  const monthDays = calendarDays.filter((day) => day.inCurrentMonth);
  const monthStart = monthDays[0]?.iso;
  const monthEnd = monthDays[monthDays.length - 1]?.iso;
  let bookedNights = 0;
  let availableNights = 0;

  const channelStays = blocks.filter(isChannelReservation);

  const dateInViewedMonth = (iso: string) =>
    Boolean(monthStart && monthEnd && iso >= monthStart && iso <= monthEnd);

  // In-house now: stay occupies property-local today (not month-scoped).
  const currentGuests =
    bookings.filter((booking) => bookingOccupiesDay(booking, todayIso)).length +
    channelStays.filter((stay) =>
      bookingOccupiesDay(
        { arrivalDate: stay.startDate, departureDate: stay.endDate },
        todayIso,
      ),
    ).length;

  // Departed: checkout day is in the viewed month and the stay has already ended.
  const departed =
    bookings.filter(
      (booking) =>
        dateInViewedMonth(booking.departureDate) && booking.departureDate <= todayIso,
    ).length +
    channelStays.filter(
      (stay) => dateInViewedMonth(stay.endDate) && stay.endDate <= todayIso,
    ).length;

  // Arriving: check-in day is in the viewed month and still in the future.
  const arriving =
    bookings.filter(
      (booking) =>
        dateInViewedMonth(booking.arrivalDate) && booking.arrivalDate > todayIso,
    ).length +
    channelStays.filter(
      (stay) => dateInViewedMonth(stay.startDate) && stay.startDate > todayIso,
    ).length;

  for (const day of monthDays) {
    for (const room of rooms) {
      availableNights += room.availableCount;
      const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
      bookedNights += roomBookings.filter((booking) =>
        bookingOccupiesDay(booking, day.iso),
      ).length;

      const roomChannelBlocks = channelStays.filter((block) => block.roomId === room.id);
      bookedNights += roomChannelBlocks.filter((block) =>
        bookingOccupiesDay(
          { arrivalDate: block.startDate, departureDate: block.endDate },
          day.iso,
        ),
      ).length;
    }
  }

  const occupancyPercent =
    availableNights > 0 ? Math.round((bookedNights / availableNights) * 100) : 0;

  return {
    currentGuests,
    arriving,
    departed,
    occupancyPercent,
    bookedNights,
    availableNights,
  };
}

export function formatTimelineDayHeader(date: Date, iso: string, todayIso: string) {
  const dayNumber = date.getDate();
  const isToday = iso === todayIso;
  const weekday = isToday
    ? "Today"
    : dayNumber === 1
      ? new Intl.DateTimeFormat("en", { month: "short" }).format(date)
      : new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return {
    weekday,
    dayNumber,
    isWeekend,
    isToday,
  };
}

export type TimelineRangeQuery = {
  fromIso?: string;
  toIso?: string;
};

function withTimelineRangeParams(
  params: URLSearchParams,
  monthKey: string,
  range?: TimelineRangeQuery,
) {
  params.set("month", monthKey);
  if (range?.fromIso) {
    params.set("from", range.fromIso);
  }
  if (range?.toIso) {
    params.set("to", range.toIso);
  }
}

export function getTimelineBarHref(
  bar: Pick<TimelineBar, "kind" | "itemKey">,
  monthKey: string,
  range?: TimelineRangeQuery,
) {
  const params = new URLSearchParams();
  withTimelineRangeParams(params, monthKey, range);

  if (bar.kind === "block" || bar.kind === "channel") {
    params.set("block", bar.itemKey);
  } else {
    params.set("booking", bar.itemKey);
  }

  return `/staff/calendar?${params.toString()}`;
}

export function getTimelineDayHref(
  roomId: string,
  iso: string,
  monthKey: string,
  range?: TimelineRangeQuery,
) {
  const params = new URLSearchParams();
  withTimelineRangeParams(params, monthKey, range);
  params.set("room", roomId);
  params.set("date", iso);
  return `/staff/calendar?${params.toString()}`;
}

/** `${roomId}:${iso}` keys for nights shut by a staff type closure (not channel stays). */
export function buildStaffClosedDayKeys({
  staffClosures,
  calendarDays,
}: {
  staffClosures: Array<{ roomId: string; startDate: string; endDate: string }>;
  calendarDays: CalendarDay[];
}): Set<string> {
  const keys = new Set<string>();

  for (const block of staffClosures) {
    for (const day of calendarDays) {
      if (
        bookingOccupiesDay(
          { arrivalDate: block.startDate, departureDate: block.endDate },
          day.iso,
        )
      ) {
        keys.add(`${block.roomId}:${day.iso}`);
      }
    }
  }

  return keys;
}

export function isUnitDayStaffClosed(
  unit: Pick<RoomUnit, "roomIds">,
  iso: string,
  closedDayKeys: ReadonlySet<string>,
) {
  return unit.roomIds.some((roomId) => closedDayKeys.has(`${roomId}:${iso}`));
}
