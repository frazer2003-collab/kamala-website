export function getBookingPaymentReturnUrl(bookingId: string) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return `${base}/booking/confirmed?booking_id=${encodeURIComponent(bookingId)}`;
}
