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
    return "Pay the full stay online by card or Thai QR (PromptPay), or arrange pay on arrival if offered. Details appear in the booking form.";
  }

  if (allowPayOnArrival) {
    return "Pay the full stay on arrival unless staff confirm another arrangement.";
  }

  if (hasStripe) {
    return "Pay the full stay online by card or Thai QR (PromptPay) when you book. Staff then confirm your reservation.";
  }

  return "We confirm by email and send payment details for the full stay.";
}
