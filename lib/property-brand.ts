import { isChiangMaiLocation } from "@/lib/home-hero-copy";

const LEGACY_CHIANG_MAI_NAME = "Kamala Guesthouse";
const CANONICAL_CHIANG_MAI_NAME = "Kamala's Boutique Guesthouse";

function taglineRedundantWithName(propertyName: string, propertyTagline: string): boolean {
  const nameLower = propertyName.trim().toLowerCase();
  const taglineLower = propertyTagline.trim().toLowerCase();

  if (!taglineLower) {
    return true;
  }

  if (nameLower.includes(taglineLower)) {
    return true;
  }

  if (
    taglineLower === "guesthouse" &&
    /\bguest\s*house\b/i.test(propertyName)
  ) {
    return true;
  }

  return false;
}

/** Tagline shown under the property name — omitted when it repeats the name. */
export function formatPropertyTagline(
  propertyName: string,
  propertyTagline: string,
): string | null {
  const tagline = propertyTagline.trim();
  if (!tagline || taglineRedundantWithName(propertyName, tagline)) {
    return null;
  }

  return tagline;
}

export function normalizePropertyBrand<
  T extends { propertyName: string; propertyTagline: string; addressLine: string | null },
>(settings: T): T {
  const locationHint =
    settings.addressLine?.trim() ||
    (taglineRedundantWithName(settings.propertyName, settings.propertyTagline)
      ? ""
      : settings.propertyTagline);

  const inChiangMai =
    isChiangMaiLocation(locationHint) ||
    isChiangMaiLocation(settings.addressLine ?? "");

  if (!inChiangMai) {
    return settings;
  }

  let propertyName = settings.propertyName;
  let propertyTagline = settings.propertyTagline;

  if (propertyName.trim() === LEGACY_CHIANG_MAI_NAME) {
    propertyName = CANONICAL_CHIANG_MAI_NAME;
  }

  if (
    taglineRedundantWithName(propertyName, propertyTagline) ||
    propertyTagline.trim().toLowerCase() === "guesthouse"
  ) {
    propertyTagline = "Chiang Mai Old City";
  }

  if (
    propertyName === settings.propertyName &&
    propertyTagline === settings.propertyTagline
  ) {
    return settings;
  }

  return { ...settings, propertyName, propertyTagline };
}

export function buildBookingPaymentNote(
  allowPayOnArrival: boolean,
  hasStripe: boolean,
): string {
  if (allowPayOnArrival && hasStripe) {
    return "A 50% deposit reserves your room — pay online by card or on arrival. Details appear in the booking form.";
  }

  if (allowPayOnArrival) {
    return "A 50% deposit reserves your room — pay on arrival unless staff confirm another arrangement.";
  }

  if (hasStripe) {
    return "A 50% deposit reserves your room — pay online by card when you book. The rest is due before check-in.";
  }

  return "A 50% deposit reserves your room — we confirm by email and send payment details with your stay.";
}
