export const DESK_SELLABLE_CATEGORIES = [
  "room",
  "drink",
  "food",
  "laundry",
  "extra",
] as const;

export const DESK_COUNTED_UNITS = ["count", "grams"] as const;

export type DeskSellableCategory =
  (typeof DESK_SELLABLE_CATEGORIES)[number];
export type DeskCountedUnit = (typeof DESK_COUNTED_UNITS)[number];

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
