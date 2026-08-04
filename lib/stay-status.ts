import { getTodayIso } from "@/lib/calendar";
import type { StayStatus } from "@/lib/content";

export const STAY_STATUS_LABELS: Record<StayStatus, string> = {
  expected: "Expected",
  "checked-in": "Checked in",
  "checked-out": "Checked out",
};

export function isStayStatus(value: string): value is StayStatus {
  return value === "expected" || value === "checked-in" || value === "checked-out";
}

/** Derive front-desk stay status from arrival/departure vs today (ISO dates). */
export function resolveStayStatusFromDates(
  arrivalDate: string,
  departureDate: string,
  todayIso: string = getTodayIso(),
): StayStatus {
  if (todayIso >= departureDate) {
    return "checked-out";
  }
  if (todayIso >= arrivalDate) {
    return "checked-in";
  }
  return "expected";
}
