/** Shared location SEO phrases — one source for title, H1, schema, and section headings. */

export const THA_PHAE_GATE_GEO = {
  latitude: 18.787,
  longitude: 98.993,
} as const;

/** Canonical gate name for guest-facing copy. */
export const THAE_PHAE_GATE_NAME = "Thae Phae Gate";

/**
 * Homepage lodging queries with real search interest (Google autocomplete).
 * Primary cluster: guesthouse / guest house Chiang Mai (winnable for an
 * independent house). Hotels queries stay secondary — OTAs own the head term.
 *
 * Do not invent stuffed variants. Spaced “Chiang Mai” is the searched form.
 * “Guesthouse” and “guest house” are near-synonyms; cover both once, naturally.
 */
export const THA_PHAE_PRIMARY_TITLE =
  "Chiang Mai Guesthouse near Thae Phae Gate";

/** Guest-facing H1 — host voice, still names Chiang Mai Old City. */
export const THA_PHAE_PRIMARY_HEADLINE =
  "A garden guesthouse in Chiang Mai Old City";

export const THA_PHAE_LOCATION_HEADLINE = `Near ${THAE_PHAE_GATE_NAME}, Chiang Mai`;

export const THA_PHAE_LOCATION_TITLE =
  "Guesthouse near Tha Pae Gate, Chiang Mai";

export const THA_PHAE_ROOMS_HEADING = `Rooms near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_BOOKING_HEADING = `Book your stay near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_ABOUT_HEADING = "How we run the house";

export const THA_PHAE_SEO_KEYWORDS = [
  "Chiang Mai guesthouse",
  "guesthouse Chiang Mai",
  "Chiang Mai guest house",
  "guest house Chiang Mai",
  "guesthouses in Chiang Mai",
  "guesthouse in Chiang Mai Old City",
  "hotels in Chiang Mai old city",
  "boutique hotel Chiang Mai old city",
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
  return `${propertyName}: a Chiang Mai guesthouse in the Old City — garden rooms with breakfast, two minutes from ${THAE_PHAE_GATE_NAME}. Book direct.`;
}

export function buildThaPhaeHeroLede(): string {
  return `A family-run Chiang Mai guesthouse in the Old City. Reserve directly on this website. We are in front of ${THAE_PHAE_GATE_NAME} — just across from the Sunday Walking Street.`;
}

export function buildThaPhaeStayStoryLede(propertyName: string): string {
  return `${propertyName} is a family-run Chiang Mai guest house: wooden rooms around a courtyard garden in the Old City. We sit just across the street from the Sunday Walking Street, with ${THAE_PHAE_GATE_NAME} about 100 metres away (a two-minute walk). Everyday essentials — 7-Eleven, ATMs, Boots, McDonald’s, and Starbucks — are steps from the door. Nawarat Bridge and its night market are about six minutes away.`;
}
