/** Why a confirmed stay was removed from the calendar (status → declined). */
export const STAY_END_REASONS = ["cancellation", "no-show"] as const;

export type StayEndReason = (typeof STAY_END_REASONS)[number];

export const STAY_END_REASON_LABELS: Record<StayEndReason, string> = {
  cancellation: "Cancellation",
  "no-show": "No-show",
};

export function isStayEndReason(value: string): value is StayEndReason {
  return (STAY_END_REASONS as readonly string[]).includes(value);
}

export function parseStayEndReason(
  raw: string | null | undefined,
): StayEndReason | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  return isStayEndReason(value) ? value : null;
}

export function formatStayEndReason(reason: StayEndReason | null | undefined) {
  if (!reason) {
    return null;
  }
  return STAY_END_REASON_LABELS[reason];
}
