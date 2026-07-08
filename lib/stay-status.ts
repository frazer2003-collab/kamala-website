import type { StayStatus } from "@/lib/content";

export const STAY_STATUS_LABELS: Record<StayStatus, string> = {
  expected: "Expected",
  "checked-in": "Checked in",
  "checked-out": "Checked out",
};

export function isStayStatus(value: string): value is StayStatus {
  return value === "expected" || value === "checked-in" || value === "checked-out";
}
