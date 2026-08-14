/** Shared location SEO phrases — one source for title, H1, schema, and section headings. */

export const THA_PHAE_GATE_GEO = {
  latitude: 18.787,
  longitude: 98.993,
} as const;

/** Canonical gate name for guest-facing copy. */
export const THAE_PHAE_GATE_NAME = "Thae Phae Gate";

/** Primary SERP title — exact phrases for “hotel in chiangmai” and “chiangmai guesthouse”. */
export const THA_PHAE_PRIMARY_TITLE = "Hotel in Chiang Mai — Chiang Mai Guesthouse";

/** On-page H1 — both target phrases, then location lives in the lede. */
export const THA_PHAE_PRIMARY_HEADLINE =
  "A Chiang Mai guesthouse and a hotel in Chiang Mai";

export const THA_PHAE_LOCATION_HEADLINE = `Near ${THAE_PHAE_GATE_NAME}, Chiang Mai`;

export const THA_PHAE_ROOMS_HEADING = `Rooms near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_BOOKING_HEADING = `Book your stay near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_ABOUT_HEADING = `A Chiang Mai guesthouse by ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_SEO_KEYWORDS = [
  "hotel in Chiang Mai",
  "hotel in chiangmai",
  "Chiang Mai guesthouse",
  "chiangmai guesthouse",
  "hotel in Chiang Mai Old City",
  `Chiang Mai guesthouse near ${THAE_PHAE_GATE_NAME}`,
] as const;

export function isThaPhaeSeoContext(
  locationLabel: string,
  addressLine: string | null,
): boolean {
  return (
    locationLabel.toLowerCase().includes("chiang mai") &&
    /thae?\s*ph?ae/i.test(addressLine ?? "")
  );
}

export function buildGoogleMapsSearchUrl(addressLine: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;
}

/** Convert settings copy like "3:00 pm" to schema.org time "15:00". */
export function toSchemaTime(hourMinute: string): string | undefined {
  const match = hourMinute.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) {
    return undefined;
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function normalizeTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:${digits}`;
}

export function buildThaPhaeMetaDescription(propertyName: string): string {
  return `${propertyName} is a hotel in Chiang Mai and a Chiang Mai guesthouse near ${THAE_PHAE_GATE_NAME}. Garden rooms, two minutes to the Old City gate.`;
}

export function buildThaPhaeHeroLede(): string {
  return `Looking for a hotel in Chiang Mai, or a Chiang Mai guesthouse near the Old City? We are a small stay on Tha Phae Road Soi 6 — just across from the Sunday Walking Street, with ${THAE_PHAE_GATE_NAME} a two-minute walk away.`;
}

export function buildThaPhaeStayStoryLede(propertyName: string): string {
  return `${propertyName} is a hotel in Chiang Mai that travellers choose as a Chiang Mai guesthouse base — wooden rooms around a courtyard garden, not a resort block. Feel at home here — we sit just across the street from the Sunday Walking Street, with ${THAE_PHAE_GATE_NAME} about 100 metres away (a two-minute walk). Everyday essentials — 7-Eleven, ATMs, Boots, McDonald’s, and Starbucks — are steps from the door. Nawarat Bridge and its night market are about six minutes away.`;
}
