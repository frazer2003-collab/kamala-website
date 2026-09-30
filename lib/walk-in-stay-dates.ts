import {
  MAX_STAY_NIGHTS,
  MIN_STAY_NIGHTS,
  countStayNights,
} from "@/lib/stay-dates";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | undefined | null): value is string {
  return Boolean(value && ISO_DATE.test(value));
}

/** Calendar-day arithmetic on an ISO date, free of local timezone drift. */
export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Departure range the picker should allow for a given arrival, so staff cannot
 * choose a same-day or over-long stay that only the server would reject.
 */
export function departureBoundsForArrival(arrival: string) {
  if (!isIsoDate(arrival)) {
    return null;
  }

  return {
    min: shiftIsoDate(arrival, MIN_STAY_NIGHTS),
    max: shiftIsoDate(arrival, MAX_STAY_NIGHTS),
  };
}

/**
 * Keep departure valid when arrival moves. The night count staff already chose
 * is preserved where possible; otherwise it is clamped into the allowed range.
 */
export function alignDepartureToArrival(
  arrival: string,
  departure: string,
  previousArrival?: string,
): string {
  const bounds = departureBoundsForArrival(arrival);
  if (!bounds) {
    return departure;
  }

  const heldNights =
    isIsoDate(previousArrival) && isIsoDate(departure)
      ? countStayNights(previousArrival, departure)
      : null;

  if (heldNights !== null) {
    return shiftIsoDate(arrival, heldNights);
  }

  if (!isIsoDate(departure) || departure < bounds.min) {
    return bounds.min;
  }

  if (departure > bounds.max) {
    return bounds.max;
  }

  return departure;
}
