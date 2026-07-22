/** Staff-note markers for paid or intentional overbooks. */

export const OVERBOOKED_AT_PAYMENT_NOTE =
  "OVERBOOKED AT PAYMENT — guest paid; contact them by email or phone to resolve dates/room.";

export function overbookedByStaffNote(isoDate: string) {
  return `OVERBOOKED BY STAFF — ${isoDate}: stay saved over capacity. Resolve with guest if needed.`;
}

export function isPaidOverbookNote(staffNote: string | null | undefined) {
  return Boolean(staffNote?.includes("OVERBOOKED AT PAYMENT"));
}

/** Shared staff capacity / overbook flash copy (walk-in, calendar edit, day panel). */
export function staffCapacityErrorMessage(code?: string | null) {
  switch (code) {
    case "capacity-verify-failed":
      return "Could not verify room availability. Try again in a moment.";
    case "overbook":
      return "These dates look full for this room type.";
    default:
      return null;
  }
}

export const OVERBOOK_SAVE_ANYWAY_HINT =
  " Saving anyway will overbook this room type.";
