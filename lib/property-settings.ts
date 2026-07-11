import { cache } from "react";
import { unstable_cache } from "next/cache";
import { houseRules } from "@/lib/content";
import {
  DEFAULT_CALENDAR_COLORS,
  normalizeCalendarColors,
  type CalendarColors,
} from "@/lib/calendar-colors";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type PropertySettingsRow,
} from "@/lib/supabase";
import type { PropertyCurrency } from "@/lib/currency";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { DEFAULT_HERO_IMAGE_URL } from "@/lib/home-hero-media";
import { sanitizeMediaUrl } from "@/lib/media-url";
import { normalizePropertyBrand } from "@/lib/property-brand";

export type PropertySettings = {
  propertyName: string;
  propertyTagline: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  checkInFrom: string;
  checkInUntil: string;
  quietHours: string;
  currency: PropertyCurrency;
  allowPayOnArrival: boolean;
  houseRules: string[];
  cancellationPolicy: string;
  privacyPolicy: string;
  termsSummary: string;
  lineUrl: string | null;
  whatsappUrl: string | null;
  calendarColors: CalendarColors;
  heroImageUrl: string | null;
  source: "supabase" | "defaults";
};

const defaultSettings: PropertySettings = {
  propertyName: "Kamala's Boutique Guesthouse",
  propertyTagline: "Chiang Mai Old City",
  contactEmail: null,
  contactPhone: null,
  addressLine:
    "2/7 Tha Phae Rd Soi 6, Changklan, Mueang Chiang Mai District, Chiang Mai 50100",
  checkInFrom: "3:00 pm",
  checkInUntil: "8:00 pm",
  quietHours: "10:00 pm",
  currency: "thb",
  allowPayOnArrival: false,
  houseRules: [...houseRules],
  cancellationPolicy:
    "Cancel at least 7 days before arrival for a full deposit refund. Later cancellations are reviewed case by case.",
  privacyPolicy:
    "We use your contact details only to manage your booking and stay. We do not sell guest data.",
  termsSummary:
    "A 50% deposit reserves your room. The remaining balance is due before check-in unless staff confirm another arrangement.",
  lineUrl: null,
  whatsappUrl: null,
  calendarColors: { ...DEFAULT_CALENDAR_COLORS },
  heroImageUrl: DEFAULT_HERO_IMAGE_URL,
  source: "defaults",
};

function mapPropertySettings(row: PropertySettingsRow): PropertySettings {
  return {
    propertyName: row.property_name,
    propertyTagline: row.property_tagline,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    addressLine: row.address_line,
    checkInFrom: row.check_in_from,
    checkInUntil: row.check_in_until,
    quietHours: row.quiet_hours,
    currency: row.currency,
    allowPayOnArrival: row.allow_pay_on_arrival,
    houseRules: row.house_rules,
    cancellationPolicy: row.cancellation_policy,
    privacyPolicy: row.privacy_policy,
    termsSummary: row.terms_summary,
    lineUrl: row.line_url,
    whatsappUrl: row.whatsapp_url,
    calendarColors: normalizeCalendarColors({
      available: row.calendar_color_available,
      closed: row.calendar_color_closed,
      booking: row.calendar_color_booking,
      soldOut: row.calendar_color_sold_out ?? undefined,
    }),
    heroImageUrl: sanitizeMediaUrl(row.hero_image_url),
    source: "supabase",
  };
}

export async function getPropertySettings(): Promise<PropertySettings> {
  return getPropertySettingsCached();
}

const getPropertySettingsCached = cache(
  unstable_cache(
    async (): Promise<PropertySettings> => fetchPropertySettings(),
    ["property-settings"],
    { revalidate: 120, tags: [PUBLIC_CACHE_TAGS.propertySettings] },
  ),
);

function finalizePropertySettings(settings: PropertySettings): PropertySettings {
  return normalizePropertyBrand(settings);
}

async function fetchPropertySettings(): Promise<PropertySettings> {
  if (!hasStaffSupabaseConfig()) {
    return finalizePropertySettings(defaultSettings);
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("property_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      return finalizePropertySettings(defaultSettings);
    }

    return finalizePropertySettings(mapPropertySettings(data));
  } catch {
    return finalizePropertySettings(defaultSettings);
  }
}

export type PropertySettingsInput = {
  propertyName: string;
  propertyTagline: string;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  checkInFrom: string;
  checkInUntil: string;
  quietHours: string;
  currency: PropertyCurrency;
  allowPayOnArrival: boolean;
  houseRules: string[];
  cancellationPolicy: string;
  privacyPolicy: string;
  termsSummary: string;
  lineUrl: string | null;
  whatsappUrl: string | null;
  calendarColors: CalendarColors;
};

export function toPropertySettingsRow(input: PropertySettingsInput) {
  return {
    property_name: input.propertyName,
    property_tagline: input.propertyTagline,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    address_line: input.addressLine,
    check_in_from: input.checkInFrom,
    check_in_until: input.checkInUntil,
    quiet_hours: input.quietHours,
    currency: input.currency,
    allow_pay_on_arrival: input.allowPayOnArrival,
    house_rules: input.houseRules,
    cancellation_policy: input.cancellationPolicy,
    privacy_policy: input.privacyPolicy,
    terms_summary: input.termsSummary,
    line_url: input.lineUrl,
    whatsapp_url: input.whatsappUrl,
    calendar_color_available: input.calendarColors.available,
    calendar_color_closed: input.calendarColors.closed,
    calendar_color_booking: input.calendarColors.booking,
    calendar_color_sold_out: input.calendarColors.soldOut,
    updated_at: new Date().toISOString(),
  };
}
