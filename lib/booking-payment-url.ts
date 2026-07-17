import type { Locale } from "@/lib/i18n";

export function getBookingPaymentReturnUrl(bookingId: string, locale?: Locale) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const params = new URLSearchParams({
    booking_id: bookingId,
  });
  if (locale) {
    params.set("locale", locale);
  }

  return `${base}/booking/confirmed?${params.toString()}`;
}
