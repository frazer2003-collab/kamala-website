import { getPropertyTodayIso } from "@/lib/calendar";
import { addIsoDays } from "@/lib/room-day-inventory";

export type StayDates = {
  arrival: string;
  departure: string;
  nights: number;
};

/** Inclusive guest/staff stay length bounds (nights between arrival and departure). */
export const MIN_STAY_NIGHTS = 1;
export const MAX_STAY_NIGHTS = 31;

export function isStayLengthAllowed(nights: number): boolean {
  return (
    Number.isFinite(nights) &&
    nights >= MIN_STAY_NIGHTS &&
    nights <= MAX_STAY_NIGHTS
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

function nightsBetween(arrival: string, departure: string): number | null {
  const arrivalDate = new Date(`${arrival}T00:00:00`);
  const departureDate = new Date(`${departure}T00:00:00`);

  if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
    return null;
  }

  if (departureDate <= arrivalDate) {
    return null;
  }

  return Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function parseStayDates(arrival?: string, departure?: string): StayDates | null {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) {
    return null;
  }

  const nights = nightsBetween(arrival, departure);
  if (nights === null || !isStayLengthAllowed(nights)) {
    return null;
  }

  // Property desk clock (Asia/Bangkok), not the server's local timezone.
  if (arrival < getPropertyTodayIso()) {
    return null;
  }

  return { arrival, departure, nights };
}

/** One-night stay starting on the property’s local today (tonight). */
export function getDefaultStayDates(nights: number = MIN_STAY_NIGHTS): StayDates {
  const stayNights = isStayLengthAllowed(nights) ? nights : MIN_STAY_NIGHTS;
  const today = getPropertyTodayIso();
  return {
    arrival: today,
    departure: addIsoDays(today, stayNights),
    nights: stayNights,
  };
}

/**
 * Homepage stay resolution: use the guest’s dates when present, otherwise
 * default to tonight so room cards can show Reserve / Full instead of Check dates.
 * Incomplete or invalid date params are errors — they do not fall back to tonight.
 */
export function resolveHomeStayDates(
  arrival?: string,
  departure?: string,
): {
  stayDates: StayDates | null;
  dateError: boolean;
  usedDefault: boolean;
} {
  if (!arrival && !departure) {
    return {
      stayDates: getDefaultStayDates(),
      dateError: false,
      usedDefault: true,
    };
  }

  const parsed = parseStayDates(arrival, departure);
  return {
    stayDates: parsed,
    dateError: !parsed,
    usedDefault: false,
  };
}

/** True when the query has a well-formed stay whose arrival is already in the past. */
export function isStaleStayDateQuery(arrival?: string, departure?: string): boolean {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) {
    return false;
  }

  const nights = nightsBetween(arrival, departure);
  if (nights === null || !isStayLengthAllowed(nights)) {
    return false;
  }

  return arrival < getPropertyTodayIso();
}

/**
 * Roll a past stay forward to property-local today, keeping the same night count.
 * Returns null when the query is not a recognizable past stay.
 */
export function refreshStaleStayDates(
  arrival?: string,
  departure?: string,
): StayDates | null {
  if (!isStaleStayDateQuery(arrival, departure) || !isIsoDate(arrival) || !isIsoDate(departure)) {
    return null;
  }

  const nights = nightsBetween(arrival, departure);
  if (nights === null) {
    return null;
  }

  const today = getPropertyTodayIso();
  return {
    arrival: today,
    departure: addIsoDays(today, nights),
    nights,
  };
}

export function buildHomeStaySearchParams(input: {
  arrival: string;
  departure: string;
  room?: string;
  lang?: string;
}): string {
  const params = new URLSearchParams();
  params.set("arrival", input.arrival);
  params.set("departure", input.departure);
  if (input.room) {
    params.set("room", input.room);
  }
  if (input.lang) {
    params.set("lang", input.lang);
  }
  return params.toString();
}

export function formatStayDateRange(arrival: string, departure: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(new Date(`${arrival}T00:00:00`))} – ${formatter.format(new Date(`${departure}T00:00:00`))}`;
}
