/** Suggested stock units — staff can type any unit per item. */
export const DESK_UNIT_SUGGESTIONS = [
  "count",
  "pack",
  "bottle",
  "ml",
  "L",
  "grams",
  "kg",
  "piece",
] as const;

/** Seeded category keys with special desk behavior (do not rename casually). */
export const DESK_SYSTEM_CATEGORY_KEYS = ["room", "laundry", "food"] as const;

/** Guest laundry is desk slips/expenses — not a menu sellable category. */
export const DESK_HIDDEN_MENU_CATEGORY_KEYS = ["laundry"] as const;

/** @deprecated Prefer listDeskItemCategories — kept for tests/fallback labels. */
export const DESK_SELLABLE_CATEGORIES = [
  "room",
  "drink",
  "food",
  "laundry",
  "extra",
] as const;

export function isHiddenMenuCategory(key: string) {
  return (DESK_HIDDEN_MENU_CATEGORY_KEYS as readonly string[]).includes(key);
}

/** @deprecated Units are free text; suggestions live in DESK_UNIT_SUGGESTIONS. */
export const DESK_COUNTED_UNITS = ["count", "grams"] as const;

export type DeskSellableCategory = string;
export type DeskCountedUnit = string;

export type DeskItemCategory = {
  id: string;
  key: string;
  nameEn: string;
  nameTh: string;
  sortOrder: number;
  active: boolean;
};

export type BilingualDeskItem = {
  nameTh: string;
  nameEn: string;
};

export function bilingualItemLabel(item: BilingualDeskItem): string {
  const thai = item.nameTh.trim();
  const english = item.nameEn.trim();

  if (!thai) {
    return english;
  }
  if (!english || thai === english) {
    return thai;
  }
  return `${thai} / ${english}`;
}

export function itemLabelForLocale(
  item: BilingualDeskItem,
  locale: "th" | "en",
): string {
  const preferred = locale === "th" ? item.nameTh : item.nameEn;
  const fallback = locale === "th" ? item.nameEn : item.nameTh;
  return preferred.trim() || fallback.trim();
}

export function categoryLabel(
  category: DeskItemCategory | undefined,
  key: string,
  locale: "th" | "en",
): string {
  if (category) {
    return itemLabelForLocale(
      { nameEn: category.nameEn, nameTh: category.nameTh },
      locale,
    );
  }
  return key;
}

export function normalizeDeskUnit(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function slugifyCategoryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
