import type { StaffBooking } from "@/lib/booking-requests";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import { isChannelReservation } from "@/lib/room-blocks";
import { getTodayIso } from "@/lib/calendar";
import { addIsoDays } from "@/lib/room-day-inventory";

export function normalizeStaffCalendarQuery(query: string) {
  return query.trim().toLowerCase();
}

export function stayMatchesStaffCalendarQuery(
  query: string,
  parts: Array<string | number | null | undefined>,
) {
  const normalized = normalizeStaffCalendarQuery(query);
  if (!normalized) {
    return true;
  }

  return parts.some((part) => {
    if (part === null || part === undefined || part === "") {
      return false;
    }
    return String(part).toLowerCase().includes(normalized);
  });
}

/** Arrivals from today through +3 days — matches Prepare view. */
export function countPrepareHorizonArrivals(
  bookings: StaffBooking[],
  blocks: StaffRoomBlock[],
  todayIso = getTodayIso(),
) {
  const horizon = addIsoDays(todayIso, 3);
  let count = 0;

  for (const booking of bookings) {
    if (booking.arrivalDate >= todayIso && booking.arrivalDate <= horizon) {
      count += 1;
    }
  }

  for (const block of blocks) {
    if (!isChannelReservation(block)) {
      continue;
    }
    if (block.startDate >= todayIso && block.startDate <= horizon) {
      count += 1;
    }
  }

  return count;
}

export function countStaysMatchingQuery(
  query: string,
  bookings: StaffBooking[],
  blocks: StaffRoomBlock[],
) {
  const normalized = normalizeStaffCalendarQuery(query);
  if (!normalized) {
    return 0;
  }

  let count = 0;
  for (const booking of bookings) {
    if (
      stayMatchesStaffCalendarQuery(normalized, [
        booking.guest,
        booking.roomNumber,
        booking.roomId,
      ])
    ) {
      count += 1;
    }
  }
  for (const block of blocks) {
    if (!isChannelReservation(block)) {
      continue;
    }
    if (
      stayMatchesStaffCalendarQuery(normalized, [
        block.guestName,
        block.channelLabel,
        block.roomNumber,
        block.roomId,
      ])
    ) {
      count += 1;
    }
  }
  return count;
}
