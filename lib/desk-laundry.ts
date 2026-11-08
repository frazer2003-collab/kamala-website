export const DESK_LAUNDRY_CATEGORIES = ["laundry", "sheets"] as const;
export const DESK_LAUNDRY_STATUSES = ["unpaid", "paid"] as const;

/** Fixed sheet items staff count when sending linens out. */
export const DESK_SHEET_ITEMS = [
  { key: "duvet_cover", nameEn: "Duvet cover", nameTh: "ผ้านวม" },
  { key: "fitted_sheet", nameEn: "Fitted sheet", nameTh: "ผ้าปูที่นอน" },
  { key: "flat_sheet", nameEn: "Flat sheet", nameTh: "ผ้าปูเรียบ" },
  { key: "pillow_case", nameEn: "Pillow case", nameTh: "ปลอกหมอน" },
  { key: "bath_towel", nameEn: "Bath towel", nameTh: "ผ้าเช็ดตัว" },
  { key: "hand_towel", nameEn: "Hand towel", nameTh: "ผ้าเช็ดมือ" },
  { key: "bath_mat", nameEn: "Bath mat", nameTh: "พรมเช็ดเท้า" },
] as const;

export type DeskLaundryCategory =
  (typeof DESK_LAUNDRY_CATEGORIES)[number];
export type DeskLaundryStatus = (typeof DESK_LAUNDRY_STATUSES)[number];
export type DeskSheetItemKey = (typeof DESK_SHEET_ITEMS)[number]["key"];

export type DeskLaundryLine = {
  key: DeskSheetItemKey;
  quantity: number;
};

export type LaundryMeasure = {
  grams: number | null;
  count: number | null;
  lines?: readonly DeskLaundryLine[];
};

export type LaundryRecordInput = LaundryMeasure & {
  name: string;
  category: DeskLaundryCategory;
  email?: string | null;
};

export function isDeskSheetItemKey(value: string): value is DeskSheetItemKey {
  return DESK_SHEET_ITEMS.some((item) => item.key === value);
}

export function sheetItemLabel(
  key: string,
  locale: "th" | "en" = "en",
): string {
  const item = DESK_SHEET_ITEMS.find((entry) => entry.key === key);
  if (!item) return key;
  return locale === "th" ? item.nameTh : item.nameEn;
}

export function parseLaundryLines(raw: unknown): DeskLaundryLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: DeskLaundryLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const key = String((entry as { key?: unknown }).key ?? "");
    const quantity = Number((entry as { quantity?: unknown }).quantity ?? 0);
    if (!isDeskSheetItemKey(key)) continue;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;
    lines.push({ key, quantity });
  }
  return lines;
}

export function sumLaundryLineQuantity(
  lines: readonly DeskLaundryLine[],
): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function formatLaundryMeasure(
  measure: LaundryMeasure,
  locale: "th" | "en" = "en",
): string {
  const lines = measure.lines?.length ? measure.lines : [];
  if (lines.length) {
    const parts = lines.map(
      (line) => `${sheetItemLabel(line.key, locale)} ×${line.quantity}`,
    );
    return parts.join(", ");
  }

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

  const lines = record.lines ?? [];
  if (record.category === "sheets" && lines.length) {
    if (sumLaundryLineQuantity(lines) <= 0) {
      errors.push("Add at least one sheet item quantity.");
    }
  } else {
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
  }

  const email = record.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }

  return errors;
}
