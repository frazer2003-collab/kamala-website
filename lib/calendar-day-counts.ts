import { bookingOccupiesDay, type CalendarDay } from "@/lib/calendar";

export type DayOccupancySummary = {
  iso: string;
  bookingCount: number;
  capacity: number;
  occupancyPercent: number;
  isFull: boolean;
};

export type DayOccupancyLevel = "empty" | "light" | "medium" | "full";

export function countStaysOnDay(
  iso: string,
  {
    bookings,
    channelStays,
  }: {
    bookings: { arrivalDate: string; departureDate: string }[];
    channelStays: { startDate: string; endDate: string }[];
  },
) {
  const direct = bookings.filter((booking) => bookingOccupiesDay(booking, iso)).length;
  const channel = channelStays.filter((stay) =>
    bookingOccupiesDay(
      { arrivalDate: stay.startDate, departureDate: stay.endDate },
      iso,
    ),
  ).length;

  return direct + channel;
}

export function buildDayOccupancyMap({
  calendarDays,
  capacity,
  bookings,
  channelStays,
}: {
  calendarDays: CalendarDay[];
  capacity: number;
  bookings: { arrivalDate: string; departureDate: string }[];
  channelStays: { startDate: string; endDate: string }[];
}) {
  const safeCapacity = Math.max(0, capacity);
  const map = new Map<string, DayOccupancySummary>();

  for (const day of calendarDays) {
    const bookingCount = countStaysOnDay(day.iso, { bookings, channelStays });
    const occupancyPercent =
      safeCapacity > 0 ? Math.min(100, Math.round((bookingCount / safeCapacity) * 100)) : 0;
    const isFull = safeCapacity > 0 && bookingCount >= safeCapacity;

    map.set(day.iso, {
      iso: day.iso,
      bookingCount,
      capacity: safeCapacity,
      occupancyPercent,
      isFull,
    });
  }

  return map;
}

export function getDayOccupancyLevel({
  bookingCount,
  occupancyPercent,
  isFull,
}: Pick<DayOccupancySummary, "bookingCount" | "occupancyPercent" | "isFull">): DayOccupancyLevel {
  if (bookingCount <= 0) {
    return "empty";
  }

  if (isFull || occupancyPercent >= 100) {
    return "full";
  }

  if (occupancyPercent >= 50) {
    return "medium";
  }

  return "light";
}

export function getPropertyCapacity(rooms: { availableCount: number }[]) {
  return rooms.reduce((total, room) => total + Math.max(0, room.availableCount), 0);
}
