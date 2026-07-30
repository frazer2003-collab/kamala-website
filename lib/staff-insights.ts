import {
  formatCalendarMonthLabel,
  getCalendarMonthBounds,
  type CalendarDay,
} from "@/lib/calendar";
import { getCalendarMonthStats } from "@/lib/calendar-timeline";
import type { StaffBooking } from "@/lib/booking-requests";
import {
  BOOKING_SOURCE_LABELS,
  type BookingSource,
} from "@/lib/booking-source";
import type { Room } from "@/lib/content";
import {
  isChannelReservation,
  type StaffRoomBlock,
} from "@/lib/room-blocks";

export type StaffInsightsSourceCount = {
  label: string;
  stays: number;
};

export type StaffInsightsRoomRow = {
  roomId: string;
  roomName: string;
  nightsSold: number;
  stayCount: number;
  websiteRevenue: number;
  sources: StaffInsightsSourceCount[];
};

export type StaffInsightsReport = {
  year: number;
  month: number;
  monthLabel: string;
  monthStart: string;
  monthEnd: string;
  rooms: StaffInsightsRoomRow[];
  totals: {
    nightsSold: number;
    stayCount: number;
    websiteRevenue: number;
    websiteStayCount: number;
    occupancyPercent: number | null;
    bookedNights: number;
    availableNights: number;
  };
  revenueNote: string;
};

function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Count stay nights that fall inside [monthStart, monthEnd] inclusive. */
export function countNightsInMonth(
  arrival: string,
  departure: string,
  monthStart: string,
  monthEnd: string,
) {
  if (!arrival || !departure || departure <= arrival) {
    return 0;
  }

  const lastNight = addIsoDays(departure, -1);
  const visibleStart = arrival < monthStart ? monthStart : arrival;
  const visibleLastNight = lastNight > monthEnd ? monthEnd : lastNight;

  if (visibleStart > visibleLastNight) {
    return 0;
  }

  const start = new Date(`${visibleStart}T00:00:00`);
  const end = new Date(`${visibleLastNight}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function websiteSourceLabel(source: BookingSource | null) {
  if (!source) {
    return "Website";
  }
  return BOOKING_SOURCE_LABELS[source];
}

function channelSourceLabel(block: StaffRoomBlock) {
  if (block.bookingSource) {
    return BOOKING_SOURCE_LABELS[block.bookingSource];
  }
  return block.channelLabel?.trim() || "Channel";
}

function bumpSource(map: Map<string, number>, label: string) {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function buildMonthDays(monthStart: string, monthEnd: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = monthStart;
  while (cursor <= monthEnd) {
    const date = new Date(`${cursor}T00:00:00`);
    days.push({
      iso: cursor,
      date,
      inCurrentMonth: true,
    });
    cursor = addIsoDays(cursor, 1);
  }
  return days;
}

export function buildStaffInsightsReport({
  year,
  month,
  rooms,
  bookings,
  channelBlocks,
  monthBlocks = [],
}: {
  year: number;
  month: number;
  rooms: Room[];
  bookings: StaffBooking[];
  channelBlocks: StaffRoomBlock[];
  /** Full month blocks; non-channel closed days are ignored for sold nights. */
  monthBlocks?: StaffRoomBlock[];
}): StaffInsightsReport {
  const { monthStart, monthEnd } = getCalendarMonthBounds(year, month);
  const channelStays = [
    ...channelBlocks.filter(isChannelReservation),
    ...monthBlocks.filter(isChannelReservation),
  ];
  // Dedupe by database id when both lists overlap.
  const channelByKey = new Map<string, StaffRoomBlock>();
  for (const stay of channelStays) {
    channelByKey.set(stay.databaseId ?? stay.id, stay);
  }
  const uniqueChannelStays = [...channelByKey.values()];

  const rows = rooms.map((room) => {
    const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
    const roomChannels = uniqueChannelStays.filter((stay) => stay.roomId === room.id);
    const sources = new Map<string, number>();
    let nightsSold = 0;
    let stayCount = 0;
    let websiteRevenue = 0;

    for (const booking of roomBookings) {
      const nights = countNightsInMonth(
        booking.arrivalDate,
        booking.departureDate,
        monthStart,
        monthEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, websiteSourceLabel(booking.bookingSource));
      if (booking.estimatedTotal > 0) {
        websiteRevenue += booking.estimatedTotal;
      }
    }

    for (const stay of roomChannels) {
      const nights = countNightsInMonth(
        stay.startDate,
        stay.endDate,
        monthStart,
        monthEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, channelSourceLabel(stay));
    }

    return {
      roomId: room.id,
      roomName: room.name,
      nightsSold,
      stayCount,
      websiteRevenue,
      sources: [...sources.entries()]
        .map(([label, stays]) => ({ label, stays }))
        .sort((a, b) => b.stays - a.stays || a.label.localeCompare(b.label)),
    } satisfies StaffInsightsRoomRow;
  });

  rows.sort(
    (a, b) =>
      b.nightsSold - a.nightsSold ||
      b.websiteRevenue - a.websiteRevenue ||
      a.roomName.localeCompare(b.roomName),
  );

  const calendarDays = buildMonthDays(monthStart, monthEnd);
  const monthStats = getCalendarMonthStats({
    bookings,
    blocks: uniqueChannelStays,
    calendarDays,
    rooms,
  });

  const totals = {
    nightsSold: rows.reduce((sum, row) => sum + row.nightsSold, 0),
    stayCount: rows.reduce((sum, row) => sum + row.stayCount, 0),
    websiteRevenue: rows.reduce((sum, row) => sum + row.websiteRevenue, 0),
    websiteStayCount: bookings.filter(
      (booking) =>
        countNightsInMonth(
          booking.arrivalDate,
          booking.departureDate,
          monthStart,
          monthEnd,
        ) > 0 && booking.estimatedTotal > 0,
    ).length,
    occupancyPercent: monthStats.availableNights > 0 ? monthStats.occupancyPercent : null,
    bookedNights: monthStats.bookedNights,
    availableNights: monthStats.availableNights,
  };

  return {
    year,
    month,
    monthLabel: formatCalendarMonthLabel(year, month),
    monthStart,
    monthEnd,
    rooms: rows,
    totals,
    revenueNote:
      "Money counts website bookings with a saved stay total. Airbnb and other calendar channels count toward nights, not money.",
  };
}
