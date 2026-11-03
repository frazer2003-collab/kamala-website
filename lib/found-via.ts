import type { Locale } from "@/lib/i18n";

export type FoundVia =
  | "google_search"
  | "google_maps"
  | "ai_assistant"
  | "booking_site"
  | "tripadvisor"
  | "social"
  | "friend"
  | "returning"
  | "walked_past"
  | "other";

/** "search" and "ai" choices ask what the guest typed; "other" asks where. */
type DetailPrompt = "search" | "ai" | "other" | null;

type FoundViaOption = {
  value: FoundVia;
  label: Record<Locale, string>;
  detail: DetailPrompt;
};

export const FOUND_VIA_OPTIONS: FoundViaOption[] = [
  { value: "google_search", label: { en: "Google search", th: "ค้นหาใน Google" }, detail: "search" },
  { value: "google_maps", label: { en: "Google Maps", th: "Google Maps" }, detail: null },
  {
    value: "ai_assistant",
    label: { en: "ChatGPT or another AI assistant", th: "ChatGPT หรือผู้ช่วย AI อื่น ๆ" },
    detail: "ai",
  },
  {
    value: "booking_site",
    label: { en: "Booking.com, Agoda or another booking site", th: "Booking.com, Agoda หรือเว็บจองอื่น ๆ" },
    detail: null,
  },
  { value: "tripadvisor", label: { en: "Tripadvisor", th: "Tripadvisor" }, detail: null },
  {
    value: "social",
    label: { en: "Facebook, TikTok or Instagram", th: "Facebook, TikTok หรือ Instagram" },
    detail: null,
  },
  { value: "friend", label: { en: "A friend or family", th: "เพื่อนหรือครอบครัวแนะนำ" }, detail: null },
  { value: "returning", label: { en: "I've stayed before", th: "เคยมาพักแล้ว" }, detail: null },
  { value: "walked_past", label: { en: "Walked past", th: "เดินผ่านมาเห็น" }, detail: null },
  { value: "other", label: { en: "Somewhere else", th: "ที่อื่น" }, detail: "other" },
];

export const FOUND_VIA_DETAIL_MAX = 300;

export function parseFoundVia(value: string | null | undefined): FoundVia | null {
  const option = FOUND_VIA_OPTIONS.find((entry) => entry.value === value);
  return option ? option.value : null;
}

export function foundViaDetailPrompt(value: string | null | undefined): DetailPrompt {
  return FOUND_VIA_OPTIONS.find((entry) => entry.value === value)?.detail ?? null;
}

/** Keeps the detail only when the chosen answer asks for one. */
export function cleanFoundViaDetail(
  foundVia: FoundVia | null,
  detail: string | null | undefined,
): string | null {
  if (!foundVia || !foundViaDetailPrompt(foundVia)) {
    return null;
  }
  const trimmed = (detail ?? "").replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, FOUND_VIA_DETAIL_MAX) : null;
}

export function foundViaLabel(value: string | null | undefined, locale: Locale = "en") {
  return FOUND_VIA_OPTIONS.find((entry) => entry.value === value)?.label[locale] ?? null;
}
