/** How long a staff tab may sit unused before sign-out. */
export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Show a stay-signed-in warning this long before idle expiry. */
export const STAFF_IDLE_WARNING_MS = 2 * 60 * 1000;

/** Shared across staff tabs so activity in one extends the others. */
export const STAFF_IDLE_STORAGE_KEY = "kamala_staff_last_activity";

export type StaffIdlePhase = "active" | "warning" | "expired";

export function staffIdlePhase(
  now: number,
  lastActivityAt: number,
  timeoutMs: number = STAFF_IDLE_TIMEOUT_MS,
  warningMs: number = STAFF_IDLE_WARNING_MS,
): StaffIdlePhase {
  const idleFor = Math.max(0, now - lastActivityAt);
  if (idleFor >= timeoutMs) {
    return "expired";
  }
  if (idleFor >= timeoutMs - warningMs) {
    return "warning";
  }
  return "active";
}

export function staffIdleMsRemaining(
  now: number,
  lastActivityAt: number,
  timeoutMs: number = STAFF_IDLE_TIMEOUT_MS,
) {
  return Math.max(0, timeoutMs - Math.max(0, now - lastActivityAt));
}

export function formatStaffIdleCountdown(msRemaining: number) {
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
