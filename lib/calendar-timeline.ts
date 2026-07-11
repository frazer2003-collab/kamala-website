import {
  bookingOccupiesDay,
  type CalendarDay,
} from "@/lib/calendar";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { Room } from "@/lib/content";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import { getStaffRoomBlockKey, isChannelReservation } from "@/lib/room-blocks";
import { STAY_STATUS_LABELS } from "@/lib/stay-status";

export type TimelineBar = {
  key: string;
  itemKey: string;
  kind: "booking" | "block" | "channel";
  label: string;
  sublabel: string;
  stayStatus: "expected" | "checked-in" | "checked-out" | "blocked";
  startCol: number;
  span: number;
  lane: number;
  showLabel: boolean;
  compact: boolean;
  continuesLeft: boolean;
  continuesRight: boolean;
  /** Waiting for staff to assign a physical room number. */
  needsRoom?: boolean;
};

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getClippedBarRange(
  arrival: string,
  departure: string,
  calendarDays: CalendarDay[],
) {
  const firstIso = calendarDays[0]?.iso;
  const lastIso = calendarDays[calendarDays.length - 1]?.iso;

  if (!firstIso || !lastIso || departure <= firstIso || arrival >= departure) {
    return null;
  }

  const visibleStart = arrival < firstIso ? firstIso : arrival;
  const lastNight = addIsoDays(departure, -1);
  const visibleLastNight = lastNight > lastIso ? lastIso : lastNight;

  if (visibleStart > visibleLastNight) {
    return null;
  }

  const startIdx = calendarDays.findIndex((day) => day.iso === visibleStart);
  const endIdx = calendarDays.findIndex((day) => day.iso === visibleLastNight);

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  return {
    startCol: startIdx + 1,
    span: endIdx - startIdx + 1,
    continuesLeft: arrival < firstIso,
    continuesRight: departure > addIsoDays(lastIso, 1),
  };
}

function rangesOverlap(
  a: { startCol: number; span: number },
  b: { startCol: number; span: number },
) {
  return a.startCol < b.startCol + b.span && b.startCol < a.startCol + a.span;
}

function assignTimelineLanes(bars: Omit<TimelineBar, "lane">[]): TimelineBar[] {
  const sorted = [...bars].sort((left, right) => {
    if (left.startCol !== right.startCol) {
      return left.startCol - right.startCol;
    }

    return right.span - left.span;
  });
  const lanes: { startCol: number; span: number }[] = [];
  const placed: TimelineBar[] = [];

  for (const bar of sorted) {
    let lane = 0;

    while (lane < lanes.length && rangesOverlap(bar, lanes[lane])) {
      lane += 1;
    }

    lanes[lane] = { startCol: bar.startCol, span: bar.span };
    placed.push({ ...bar, lane });
  }

  return placed;
}

export function buildRoomTimelineBars({
  bookings,
  channelReservations = [],
  calendarDays,
  /** When true, only stays without a room number. */
  unassignedOnly = false,
}: {
  bookings: StaffBooking[];
  channelReservations?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  unassignedOnly?: boolean;
}): TimelineBar[] {
  const bars: Omit<TimelineBar, "lane">[] = [];
  const visibleBookings = unassignedOnly
    ? bookings.filter((booking) => !booking.roomUnitId)
    : bookings;
  const visibleChannels = unassignedOnly
    ? channelReservations.filter((reservation) => !reservation.roomUnitId)
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

    const needsRoom = !booking.roomUnitId;
    bars.push({
      key: `booking-${getStaffBookingKey(booking)}-${range.startCol}`,
      itemKey: getStaffBookingKey(booking),
      kind: "booking",
      label: booking.guest,
      sublabel: needsRoom
        ? "Needs room #"
        : booking.roomNumber
          ? `Room ${booking.roomNumber}`
          : STAY_STATUS_LABELS[booking.stayStatus],
      stayStatus: booking.stayStatus,
      showLabel: true,
      compact: range.span < 2,
      needsRoom,
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
    const needsRoom = !reservation.roomUnitId;
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
      stayStatus: "blocked",
      showLabel: true,
      compact: range.span < 2,
      needsRoom,
      ...range,
    });
  }

  return assignTimelineLanes(bars);
}

export function buildUnitTimelineBars({
  bookings,
  channelReservations = [],
  calendarDays,
  roomShortNameById,
  currentRoomId,
}: {
  bookings: StaffBooking[];
  channelReservations?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  roomShortNameById: Map<string, string>;
  currentRoomId: string;
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

    const otherType =
      booking.roomId !== currentRoomId
        ? roomShortNameById.get(booking.roomId) ?? booking.room
        : null;

    bars.push({
      key: `unit-booking-${getStaffBookingKey(booking)}-${range.startCol}`,
      itemKey: getStaffBookingKey(booking),
      kind: "booking",
      label: booking.guest,
      sublabel: otherType
        ? `${otherType} · ${STAY_STATUS_LABELS[booking.stayStatus]}`
        : STAY_STATUS_LABELS[booking.stayStatus],
      stayStatus: booking.stayStatus,
      showLabel: true,
      compact: range.span < 2,
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
    const otherType =
      reservation.roomId !== currentRoomId
        ? roomShortNameById.get(reservation.roomId) ?? reservation.roomId
        : null;
    const label = reservation.guestName.trim() || channel;

    bars.push({
      key: `unit-channel-${getStaffRoomBlockKey(reservation)}-${range.startCol}`,
      itemKey: getStaffRoomBlockKey(reservation),
      kind: "channel",
      label,
      sublabel: otherType ? `${otherType} · ${channel}` : channel,
      stayStatus: "blocked",
      showLabel: true,
      compact: range.span < 2,
      ...range,
    });
  }

  return assignTimelineLanes(bars);
}

export function getRoomBlockForDay(
  roomId: string,
  iso: string,
  blocks: StaffRoomBlock[],
) {
  return blocks.find(
    (block) =>
      block.roomId === roomId &&
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        iso,
      ),
  );
}

export function getStatusCellHref(
  roomId: string,
  iso: string,
  monthKey: string,
  blocks: StaffRoomBlock[],
) {
  const block = getRoomBlockForDay(roomId, iso, blocks);

  if (block) {
    return getTimelineBarHref(
      { kind: "block", itemKey: getStaffRoomBlockKey(block) },
      monthKey,
    );
  }

  // Bookable / open days open the day choice panel — never jump straight to Close.
  return getTimelineDayHref(roomId, iso, monthKey);
}

export function getTimelineLaneCount(bars: TimelineBar[]) {
  if (bars.length === 0) {
    return 1;
  }

  return Math.max(...bars.map((bar) => bar.lane)) + 1;
}

export function countOverlappingStaysForDay(
  iso: string,
  bookings: Array<{ arrivalDate: string; departureDate: string }>,
  blocks: Array<{ startDate: string; endDate: string }>,
) {
  let count = 0;

  for (const booking of bookings) {
    if (bookingOccupiesDay(booking, iso)) {
      count += 1;
    }
  }

  for (const block of blocks) {
    if (
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        iso,
      )
    ) {
      count += 1;
    }
  }

  return count;
}

export function getBookingsForDay(
  roomId: string,
  iso: string,
  bookings: StaffBooking[],
) {
  return bookings.filter(
    (booking) => booking.roomId === roomId && bookingOccupiesDay(booking, iso),
  );
}

export function getNetBookedForDay(
  roomId: string,
  iso: string,
  bookings: StaffBooking[],
) {
  return getBookingsForDay(roomId, iso, bookings).length;
}

export function isRoomClosedOnDay(
  roomId: string,
  iso: string,
  blocks: StaffRoomBlock[],
) {
  return blocks.some(
    (block) =>
      block.roomId === roomId &&
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        iso,
      ),
  );
}

export type DaySaleStatus = "closed" | "sold-out" | "bookable";

export function getDaySaleStatus(
  roomId: string,
  iso: string,
  blocks: StaffRoomBlock[],
  roomsToSell?: number,
): DaySaleStatus {
  if (isRoomClosedOnDay(roomId, iso, blocks)) {
    return "closed";
  }

  if (roomsToSell !== undefined && roomsToSell <= 0) {
    return "sold-out";
  }

  return "bookable";
}

export function getDaySaleStatusLabel(status: DaySaleStatus) {
  if (status === "closed") {
    return "Closed";
  }

  if (status === "sold-out") {
    return "Sold out";
  }

  return "Bookable";
}

export function getRoomsLeftForDay(
  room: Room,
  iso: string,
  bookings: StaffBooking[],
  blocks: StaffRoomBlock[],
) {
  const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
  const roomBlocks = blocks.filter((block) => block.roomId === room.id);
  const overlapping = countOverlappingStaysForDay(iso, roomBookings, roomBlocks);

  return Math.max(0, room.availableCount - overlapping);
}

export type CalendarMonthStats = {
  arrivals: number;
  departures: number;
  occupancyPercent: number;
  bookedNights: number;
  availableNights: number;
};

export function getCalendarMonthStats({
  bookings,
  blocks = [],
  calendarDays,
  rooms,
}: {
  bookings: StaffBooking[];
  blocks?: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  rooms: Room[];
}): CalendarMonthStats {
  const monthDays = calendarDays.filter((day) => day.inCurrentMonth);
  let arrivals = 0;
  let departures = 0;
  let bookedNights = 0;
  let availableNights = 0;

  for (const day of monthDays) {
    arrivals += bookings.filter((booking) => booking.arrivalDate === day.iso).length;
    departures += bookings.filter((booking) => booking.departureDate === day.iso).length;

    for (const room of rooms) {
      availableNights += room.availableCount;
      const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
      bookedNights += roomBookings.filter((booking) =>
        bookingOccupiesDay(booking, day.iso),
      ).length;

      const roomChannelBlocks = blocks.filter(
        (block) => block.roomId === room.id && isChannelReservation(block),
      );
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
    arrivals,
    departures,
    occupancyPercent,
    bookedNights,
    availableNights,
  };
}

export function formatTimelineDayHeader(date: Date, iso: string, todayIso: string) {
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return {
    weekday,
    dayNumber: date.getDate(),
    isWeekend,
    isToday: iso === todayIso,
  };
}

export function getTimelineBarHref(
  bar: Pick<TimelineBar, "kind" | "itemKey">,
  monthKey: string,
) {
  if (bar.kind === "block" || bar.kind === "channel") {
    return `/staff/calendar?month=${monthKey}&block=${encodeURIComponent(bar.itemKey)}`;
  }

  return `/staff/calendar?month=${monthKey}&booking=${encodeURIComponent(bar.itemKey)}`;
}

export function getTimelineDayHref(roomId: string, iso: string, monthKey: string) {
  return `/staff/calendar?month=${monthKey}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(iso)}`;
}

/** Open the day panel to set a temporary rooms-to-sell override. */
export function getTimelineAllotmentHref(roomId: string, iso: string, monthKey: string) {
  return `${getTimelineDayHref(roomId, iso, monthKey)}&mode=allotment`;
}

/** Bulk open/close room status (availability), not allotments. */
export function getTimelineBulkAvailabilityHref(roomId: string, monthKey: string) {
  return `/staff/calendar?month=${monthKey}&room=${encodeURIComponent(roomId)}&mode=bulk-status`;
}
