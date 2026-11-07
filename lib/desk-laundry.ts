export const DESK_LAUNDRY_CATEGORIES = ["laundry", "sheets"] as const;
export const DESK_LAUNDRY_STATUSES = [
  "sent",
  "incomplete",
  "complete",
] as const;

export type DeskLaundryCategory =
  (typeof DESK_LAUNDRY_CATEGORIES)[number];
export type DeskLaundryStatus = (typeof DESK_LAUNDRY_STATUSES)[number];

export type LaundryMeasure = {
  grams: number | null;
  count: number | null;
};

export type LaundryRecordInput = LaundryMeasure & {
  name: string;
  category: DeskLaundryCategory;
  email?: string | null;
};

export function formatLaundryMeasure(measure: LaundryMeasure): string {
  if (measure.grams != null) {
    if (measure.grams >= 1000) {
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(measure.grams / 1000)} kg`;
    }
    return `${measure.grams} g`;
  }

  if (measure.count != null) {
    return `${measure.count} ${measure.count === 1 ? "piece" : "pieces"}`;
  }

  return "No measure";
}

export function validateLaundryRecord(
  record: LaundryRecordInput,
): string[] {
  const errors: string[] = [];

  if (!record.name.trim()) {
    errors.push("Name is required.");
  }

  const hasGrams = record.grams != null;
  const hasCount = record.count != null;
  if (hasGrams && hasCount) {
    errors.push("Enter grams or count, not both.");
  } else if (!hasGrams && !hasCount) {
    errors.push("Enter grams or count.");
  } else if (
    (hasGrams && (!Number.isInteger(record.grams) || record.grams! <= 0)) ||
    (hasCount && (!Number.isInteger(record.count) || record.count! <= 0))
  ) {
    errors.push("Measure must be a positive whole number.");
  }

  const email = record.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }

  return errors;
}
