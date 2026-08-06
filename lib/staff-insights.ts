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
  eachStayNight,
  getNightlyRateDetails,
  type RoomPromotionRate,
} from "@/lib/pricing";
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
  channelRevenue: number;
  estimatedRevenue: number;
  sources: StaffInsightsSourceCount[];
};

export type StaffInsightsReport = {
  year: number;
  month: number;
  monthLabel: string;
  rangeLabel: string;
  monthStart: string;
  monthEnd: string;
  rooms: StaffInsightsRoomRow[];
  totals: {
    nightsSold: number;
    stayCount: number;
    websiteRevenue: number;
    channelRevenue: number;
    estimatedRevenue: number;
    averageNightlyRate: number | null;
    websiteStayCount: number;
    occupancyPercent: number | null;
    bookedNights: number;
    availableNights: number;
  };
  revenueNote: string;
};

function addIsoDay(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Count stay nights that fall inside [rangeStart, rangeEnd] inclusive. */
export function countNightsInMonth(
  arrival: string,
  departure: string,
  rangeStart: string,
  rangeEnd: string,
) {
  if (!arrival || !departure || departure <= arrival) {
    return 0;
  }

  const lastNight = addIsoDay(departure, -1);
  const visibleStart = arrival < rangeStart ? rangeStart : arrival;
  const visibleLastNight = lastNight > rangeEnd ? rangeEnd : lastNight;

  if (visibleStart > visibleLastNight) {
    return 0;
  }

  const start = new Date(`${visibleStart}T00:00:00`);
  const end = new Date(`${visibleLastNight}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * Sum nightly rates for stay nights that fall inside the range,
 * using the same quote rules as website bookings (day override → promo → base).
 */
export function estimateQuotedMoneyInMonth({
  roomId,
  baseRate,
  arrival,
  departure,
  monthStart,
  monthEnd,
  promotions,
  rateOverrides,
}: {
  roomId: string;
  baseRate: number;
  arrival: string;
  departure: string;
  monthStart: string;
  monthEnd: string;
  promotions: RoomPromotionRate[];
  rateOverrides?: Map<string, number>;
}) {
  if (baseRate <= 0) {
    return 0;
  }

  let total = 0;
  for (const night of eachStayNight(arrival, departure)) {
    if (night < monthStart || night > monthEnd) {
      continue;
    }
    total += getNightlyRateDetails(
      roomId,
      night,
      baseRate,
      promotions,
      rateOverrides,
    ).rate;
  }
  return total;
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

function buildRangeDays(rangeStart: string, rangeEnd: string): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = rangeStart;
  while (cursor <= rangeEnd) {
    const date = new Date(`${cursor}T00:00:00`);
    days.push({
      iso: cursor,
      date,
      inCurrentMonth: true,
    });
    cursor = addIsoDay(cursor, 1);
  }
  return days;
}

function formatRangeLabel(fromIso: string, toIso: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const from = formatter.format(new Date(`${fromIso}T00:00:00`));
  const to = formatter.format(new Date(`${toIso}T00:00:00`));
  if (fromIso === toIso) {
    return from;
  }
  return `${from} – ${to}`;
}

export function buildStaffInsightsReport({
  year,
  month,
  fromIso,
  toIso,
  rooms,
  bookings,
  channelBlocks,
  monthBlocks = [],
  promotions = [],
  rateOverrides,
}: {
  year?: number;
  month?: number;
  /** Inclusive start of the reporting window (defaults to calendar month). */
  fromIso?: string;
  /** Inclusive end of the reporting window (defaults to calendar month). */
  toIso?: string;
  rooms: Room[];
  bookings: StaffBooking[];
  channelBlocks: StaffRoomBlock[];
  /** Full window blocks; non-channel closed days are ignored for sold nights. */
  monthBlocks?: StaffRoomBlock[];
  promotions?: RoomPromotionRate[];
  rateOverrides?: Map<string, number>;
}): StaffInsightsReport {
  const resolvedYear = year ?? Number((fromIso ?? "1970-01-01").slice(0, 4));
  const resolvedMonth =
    month ?? Number((fromIso ?? "1970-01-01").slice(5, 7));
  const monthLabel = formatCalendarMonthLabel(resolvedYear, resolvedMonth);

  const monthBounds = getCalendarMonthBounds(resolvedYear, resolvedMonth);
  const rangeStart = fromIso ?? monthBounds.monthStart;
  const rangeEnd = toIso ?? monthBounds.monthEnd;

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
    let channelRevenue = 0;

    for (const booking of roomBookings) {
      const nights = countNightsInMonth(
        booking.arrivalDate,
        booking.departureDate,
        rangeStart,
        rangeEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, websiteSourceLabel(booking.bookingSource));
      if (booking.estimatedTotal > 0) {
        websiteRevenue += booking.estimatedTotal;
      } else {
        websiteRevenue += estimateQuotedMoneyInMonth({
          roomId: room.id,
          baseRate: room.rate,
          arrival: booking.arrivalDate,
          departure: booking.departureDate,
          monthStart: rangeStart,
          monthEnd: rangeEnd,
          promotions,
          rateOverrides,
        });
      }
    }

    for (const stay of roomChannels) {
      const nights = countNightsInMonth(
        stay.startDate,
        stay.endDate,
        rangeStart,
        rangeEnd,
      );
      if (nights <= 0) {
        continue;
      }
      nightsSold += nights;
      stayCount += 1;
      bumpSource(sources, channelSourceLabel(stay));
      channelRevenue += estimateQuotedMoneyInMonth({
        roomId: room.id,
        baseRate: room.rate,
        arrival: stay.startDate,
        departure: stay.endDate,
        monthStart: rangeStart,
        monthEnd: rangeEnd,
        promotions,
        rateOverrides,
      });
    }

    const estimatedRevenue = websiteRevenue + channelRevenue;

    return {
      roomId: room.id,
      roomName: room.name,
      nightsSold,
      stayCount,
      websiteRevenue,
      channelRevenue,
      estimatedRevenue,
      sources: [...sources.entries()]
        .map(([label, stays]) => ({ label, stays }))
        .sort((a, b) => b.stays - a.stays || a.label.localeCompare(b.label)),
    } satisfies StaffInsightsRoomRow;
  });

  rows.sort(
    (a, b) =>
      b.nightsSold - a.nightsSold ||
      b.estimatedRevenue - a.estimatedRevenue ||
      a.roomName.localeCompare(b.roomName),
  );

  const calendarDays = buildRangeDays(rangeStart, rangeEnd);
  const monthStats = getCalendarMonthStats({
    bookings,
    blocks: uniqueChannelStays,
    calendarDays,
    rooms,
  });

  const estimatedRevenue = rows.reduce((sum, row) => sum + row.estimatedRevenue, 0);
  const nightsSold = rows.reduce((sum, row) => sum + row.nightsSold, 0);

  const totals = {
    nightsSold,
    stayCount: rows.reduce((sum, row) => sum + row.stayCount, 0),
    websiteRevenue: rows.reduce((sum, row) => sum + row.websiteRevenue, 0),
    channelRevenue: rows.reduce((sum, row) => sum + row.channelRevenue, 0),
    estimatedRevenue,
    averageNightlyRate: nightsSold > 0 ? estimatedRevenue / nightsSold : null,
    websiteStayCount: bookings.filter(
      (booking) =>
        countNightsInMonth(
          booking.arrivalDate,
          booking.departureDate,
          rangeStart,
          rangeEnd,
        ) > 0 && booking.estimatedTotal > 0,
    ).length,
    occupancyPercent:
      monthStats.availableNights > 0 ? monthStats.occupancyPercent : null,
    bookedNights: monthStats.bookedNights,
    availableNights: monthStats.availableNights,
  };

  return {
    year: resolvedYear,
    month: resolvedMonth,
    monthLabel,
    rangeLabel: formatRangeLabel(rangeStart, rangeEnd),
    monthStart: rangeStart,
    monthEnd: rangeEnd,
    rooms: rows,
    totals,
    revenueNote:
      "Website money uses the full stay total when a stay overlaps this range. Channel nights use the website quote for nights in this range (room rate, day rates, promotions) — not the OTA payout.",
  };
}
