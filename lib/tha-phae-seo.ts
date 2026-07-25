/** Shared location SEO phrases — one source for title, H1, schema, and section headings. */

export const THA_PHAE_GATE_GEO = {
  latitude: 18.787,
  longitude: 98.993,
} as const;

/** Primary SERP title target (keep 30–60 chars). */
export const THA_PHAE_PRIMARY_TITLE = "Chiang Mai Guesthouses Near Tha Pae Gate";

/** On-page H1 — matches the common search phrasing, including Tha Pae spelling. */
export const THA_PHAE_PRIMARY_HEADLINE = "Chiang Mai guesthouses near Tha Pae Gate";

export const THA_PHAE_ROOMS_HEADING = "Rooms near Tha Pae Gate";

export const THA_PHAE_BOOKING_HEADING = "Book your stay near Tha Pae Gate";

export const THA_PHAE_ABOUT_HEADING = "A cozy guesthouse by Tha Pae Gate";

export const THA_PHAE_SEO_KEYWORDS = [
  "chiangmai guesthouses near tha pae gate",
  "Chiang Mai guesthouses near Tha Pae Gate",
  "guesthouses near Tha Pae Gate Chiang Mai",
  "guesthouse near Tha Pae Gate Chiang Mai",
  "guesthouses near Tha Phae Gate Chiang Mai",
  "guesthouse near Tha Phae Gate",
  "Thapae Gate guesthouse Chiang Mai",
  "accommodation near Tha Pae Gate Chiang Mai",
  "hotel near Tha Pae Gate Chiang Mai",
  "Chiang Mai Old City guesthouse",
  "boutique guesthouse Chiang Mai Old City",
  "book guesthouse Chiang Mai",
] as const;

export function isThaPhaeSeoContext(
  locationLabel: string,
  addressLine: string | null,
): boolean {
  return (
    locationLabel.toLowerCase().includes("chiang mai") &&
    /tha\s*ph?ae/i.test(addressLine ?? "")
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
  return `${propertyName}: Chiang Mai guesthouses near Tha Pae Gate (Tha Phae). Two-minute walk to the Old City gate, by Sunday Walking Street.`;
}

export function buildThaPhaeHeroLede(): string {
  return "Looking for Chiang Mai guesthouses near Tha Pae Gate? We are a friendly, cozy stay on Tha Phae Road Soi 6 — just across from the Sunday Walking Street, with Tha Pae Gate (also spelled Tha Phae / Thapae) a two-minute walk away.";
}

export function buildThaPhaeStayStoryLede(propertyName: string): string {
  return `${propertyName} is one of the Chiang Mai guesthouses near Tha Pae Gate that travellers choose for an easy Old City base. Feel at home here — we sit just across the street from the Sunday Walking Street, with Tha Pae Gate (Tha Phae Gate) about 100 metres away (a two-minute walk). Everyday essentials — 7-Eleven, ATMs, Boots, McDonald’s, and Starbucks — are steps from the door. Nawarat Bridge and its night market are about six minutes away.`;
}
