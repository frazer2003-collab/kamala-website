/** Client-safe guest calendar constants (no server imports). */

export type GuestNightStatus = "open" | "full";

/** Max inclusive night span the public calendar API will compute. */
export const GUEST_NIGHT_AVAILABILITY_MAX_DAYS = 62;
