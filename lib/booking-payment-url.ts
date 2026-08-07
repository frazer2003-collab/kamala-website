import type { Locale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

export function getBookingPaymentReturnUrl(bookingId: string, locale?: Locale) {
  const base =
    typeof window !== "undefined" ? window.location.origin : getSiteUrl();

  const params = new URLSearchParams({
    booking_id: bookingId,
  });
  if (locale) {
    params.set("locale", locale);
  }

  return `${base}/booking/confirmed?${params.toString()}`;
}
