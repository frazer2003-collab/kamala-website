import { bookingOccupiesDay } from "@/lib/calendar";
import {
  isUnverifiedBankHold,
  type StaffBooking,
} from "@/lib/booking-requests";
import type { StaffMessageThread } from "@/lib/booking-chat";
import type { DeskTourSale } from "@/lib/desk-ops-data";
import { countStayNights } from "@/lib/stay-dates";

const BANGKOK_OFFSET = "+07:00";
const MS_HOUR = 60 * 60 * 1000;

export type HomeGuestRow = {
  id: string;
  guest: string;
  room: string;
  doorLabel: string | null;
  href: string;
};

export type HomeTourRow = {
  id: string;
  name: string;
  guestName: string | null;
  tripDate: string;
  pickupTime: string;
  href: string;
};

export type HomeCleanRow = {
  id: string;
  guest: string;
  room: string;
  doorLabel: string | null;
  nightsSinceClean: number;
  /** True when staff marked Cleaned and the next 3-night cycle has not started. */
  cleaned: boolean;
  href: string;
};

/** Parse HH:MM or HH:MM:SS into HH:MM. */
export function parsePickupTime(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Pickup instant in Asia/Bangkok for a trip date + HH:MM. */
export function bangkokPickupMs(tripDate: string, pickupTime: string): number | null {
  const time = parsePickupTime(pickupTime);
  if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return null;
  const ms = Date.parse(`${tripDate}T${time}:00${BANGKOK_OFFSET}`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Show on Home from 24h before pickup until 6h after pickup (Bangkok).
 */
export function isTourPickupOnHomeBoard({
  tripDate,
  pickupTime,
  nowMs = Date.now(),
}: {
  tripDate: string | null | undefined;
  pickupTime: string | null | undefined;
  nowMs?: number;
}): boolean {
  if (!tripDate || !pickupTime) return false;
  const pickupMs = bangkokPickupMs(tripDate, pickupTime);
  if (pickupMs === null) return false;
  const windowStart = pickupMs - 24 * MS_HOUR;
  const windowEnd = pickupMs + 6 * MS_HOUR;
  return nowMs >= windowStart && nowMs <= windowEnd;
}

/** In-house stay needs a deep clean after 3 nights since arrival or last clean. */
export function stayNeedsDeepClean({
  arrivalDate,
  departureDate,
  cleanedOn,
  todayIso,
}: {
  arrivalDate: string;
  departureDate: string;
  cleanedOn: string | null | undefined;
  todayIso: string;
}): boolean {
  if (!bookingOccupiesDay({ arrivalDate, departureDate }, todayIso)) {
    return false;
  }
  const since =
    cleanedOn && cleanedOn >= arrivalDate && cleanedOn <= todayIso
      ? cleanedOn
      : arrivalDate;
  const nights = countStayNights(since, todayIso);
  return nights !== null && nights >= 3;
}

export function homeBankHolds(bookings: StaffBooking[]) {
  return bookings.filter((booking) => {
    if (!isUnverifiedBankHold(booking)) return false;
    // Website (and legacy null source) bank claims — not OTA channel rows.
    const source = booking.bookingSource;
    return !source || source === "website";
  });
}

export function homeTodayMoves(
  bookings: StaffBooking[],
  todayIso: string,
): { arriving: HomeGuestRow[]; departing: HomeGuestRow[] } {
  const arriving: HomeGuestRow[] = [];
  const departing: HomeGuestRow[] = [];

  for (const booking of bookings) {
    const id = booking.databaseId || booking.id;
    const row: HomeGuestRow = {
      id,
      guest: booking.guest,
      room: booking.room,
      doorLabel: booking.roomNumber ? `#${booking.roomNumber}` : null,
      href: `/staff/calendar?month=${booking.arrivalDate.slice(0, 7)}&booking=${encodeURIComponent(id)}`,
    };
    if (booking.arrivalDate === todayIso) arriving.push(row);
    if (booking.departureDate === todayIso) departing.push(row);
  }

  arriving.sort((a, b) => a.guest.localeCompare(b.guest));
  departing.sort((a, b) => a.guest.localeCompare(b.guest));
  return { arriving, departing };
}

export function homeTourPickups(
  sales: DeskTourSale[],
  nowMs = Date.now(),
): HomeTourRow[] {
  const rows: HomeTourRow[] = [];
  for (const sale of sales) {
    const tripDate = sale.tripDate || sale.saleDate;
    if (
      !isTourPickupOnHomeBoard({
        tripDate,
        pickupTime: sale.pickupTime,
        nowMs,
      })
    ) {
      continue;
    }
    const pickupTime = parsePickupTime(sale.pickupTime)!;
    rows.push({
      id: sale.id,
      name: sale.name,
      guestName: sale.guestName,
      tripDate,
      pickupTime,
      href: `/staff/trips?open=${encodeURIComponent(sale.id)}`,
    });
  }
  return rows.sort((a, b) => {
    const aMs = bangkokPickupMs(a.tripDate, a.pickupTime) ?? 0;
    const bMs = bangkokPickupMs(b.tripDate, b.pickupTime) ?? 0;
    return aMs - bMs;
  });
}

/**
 * In-house stays that have reached 3 nights since arrival stay on the board.
 * Due rows first; recently cleaned rows are greyed and sorted to the bottom.
 */
export function homeDeepCleanDue(
  bookings: Array<
    StaffBooking & { housekeepingCleanedOn?: string | null }
  >,
  todayIso: string,
): HomeCleanRow[] {
  const rows: HomeCleanRow[] = [];
  for (const booking of bookings) {
    if (
      !bookingOccupiesDay(
        {
          arrivalDate: booking.arrivalDate,
          departureDate: booking.departureDate,
        },
        todayIso,
      )
    ) {
      continue;
    }
    const nightsSinceArrival = countStayNights(booking.arrivalDate, todayIso);
    if (nightsSinceArrival === null || nightsSinceArrival < 3) {
      continue;
    }

    const due = stayNeedsDeepClean({
      arrivalDate: booking.arrivalDate,
      departureDate: booking.departureDate,
      cleanedOn: booking.housekeepingCleanedOn,
      todayIso,
    });
    const since =
      booking.housekeepingCleanedOn &&
      booking.housekeepingCleanedOn >= booking.arrivalDate
        ? booking.housekeepingCleanedOn
        : booking.arrivalDate;
    const id = booking.databaseId || booking.id;
    rows.push({
      id,
      guest: booking.guest,
      room: booking.room,
      doorLabel: booking.roomNumber ? `#${booking.roomNumber}` : null,
      nightsSinceClean: countStayNights(since, todayIso) ?? nightsSinceArrival,
      cleaned: !due,
      href: `/staff/calendar?month=${booking.arrivalDate.slice(0, 7)}&booking=${encodeURIComponent(id)}`,
    });
  }
  return rows.sort((a, b) => {
    if (a.cleaned !== b.cleaned) {
      return a.cleaned ? 1 : -1;
    }
    return (
      b.nightsSinceClean - a.nightsSinceClean || a.guest.localeCompare(b.guest)
    );
  });
}

export function homeNeedsReply(threads: StaffMessageThread[]) {
  return threads.filter((thread) => thread.needsReply);
}
