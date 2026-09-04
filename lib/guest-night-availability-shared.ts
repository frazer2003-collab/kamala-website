/** Client-safe guest calendar constants and range clamps (no server imports). */

export type GuestNightStatus = "open" | "full";

/**
 * Inclusive night span the public calendar will verify (~3 months).
 * Beyond this horizon the API stops checking and returns empty / rejects oversized windows.
 */
export const GUEST_NIGHT_AVAILABILITY_MAX_DAYS = 92;

function addIsoDaysLocal(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function countInclusiveIsoDays(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/** Last night (inclusive) the guest calendar will mark open/full from property today. */
export function guestNightAvailabilityLatestIso(todayIso: string) {
  return addIsoDaysLocal(todayIso, GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
}

export type GuestNightRangeClamp =
  | { ok: true; fromIso: string; toIso: string }
  | { ok: false; reason: "inverted" | "too-long" | "beyond-horizon" };

/**
 * Clamp a public night-availability query:
 * - bump `from` up to today
 * - reject spans longer than MAX_DAYS
 * - truncate `to` to the horizon; empty if the whole window is past the horizon
 */
export function clampGuestNightAvailabilityQuery({
  fromRaw,
  toRaw,
  todayIso,
}: {
  fromRaw: string;
  toRaw: string;
  todayIso: string;
}): GuestNightRangeClamp {
  const fromIso = fromRaw < todayIso ? todayIso : fromRaw;
  const toIso = toRaw;

  if (toIso < fromIso) {
    return { ok: false, reason: "inverted" };
  }

  if (countInclusiveIsoDays(fromIso, toIso) > GUEST_NIGHT_AVAILABILITY_MAX_DAYS) {
    return { ok: false, reason: "too-long" };
  }

  const latest = guestNightAvailabilityLatestIso(todayIso);
  const clampedTo = toIso > latest ? latest : toIso;
  if (clampedTo < fromIso) {
    return { ok: false, reason: "beyond-horizon" };
  }

  return { ok: true, fromIso, toIso: clampedTo };
}

/**
 * First night on/after startIso that is not marked full.
 * Unknown/missing statuses fail open (treated as selectable).
 */
export function findNextOpenArrivalIso(
  nights: Record<string, GuestNightStatus>,
  startIso: string,
  latestIso: string,
): string | null {
  if (startIso > latestIso) {
    return null;
  }

  let cursor = startIso;
  while (cursor <= latestIso) {
    if (nights[cursor] !== "full") {
      return cursor;
    }
    cursor = addIsoDaysLocal(cursor, 1);
  }

  return null;
}

type StaySlice = {
  arrival: string;
  departure: string;
  nights: number;
};

/**
 * If check-in lands on a full night, slide the stay forward to the next open night
 * (same length). Returns null when no change is needed or none is available.
 */
export function shiftStayDatesIfArrivalFull(
  stay: StaySlice,
  nights: Record<string, GuestNightStatus>,
  latestIso: string,
): StaySlice | null {
  if (nights[stay.arrival] !== "full") {
    return null;
  }

  const nextArrival = findNextOpenArrivalIso(nights, stay.arrival, latestIso);
  if (!nextArrival || nextArrival === stay.arrival) {
    return null;
  }

  return {
    arrival: nextArrival,
    departure: addIsoDaysLocal(nextArrival, stay.nights),
    nights: stay.nights,
  };
}
