"use server";

import { redirect } from "next/navigation";
import { recordStaffChatMessage } from "@/lib/booking-chat";
import { formatMoneySuffix } from "@/lib/currency";
import {
  clearPendingStayChange,
  clearStayChangeRefund,
  confirmPendingStayChange,
} from "@/lib/guest-stay-change-server";
import { getPropertySettings } from "@/lib/property-settings";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { formatStayDateRange } from "@/lib/stay-dates";

function bookingHref(bookingId: string, query: string) {
  return `/staff?booking=${encodeURIComponent(bookingId)}&${query}`;
}

export async function confirmStayChangeTransfer(formData: FormData) {
  await requireStaffCalendarWrite();
  const bookingId = String(formData.get("booking-id") ?? "");

  const result = await confirmPendingStayChange(bookingId);
  if (!result.ok) {
    redirect(bookingHref(bookingId, `error=stay-change-${result.reason}`));
  }

  const booking = result.booking;
  await recordStaffChatMessage({
    booking,
    body: `We received your transfer. Your stay is now ${booking.room_name}, ${formatStayDateRange(
      booking.arrival_date,
      booking.departure_date,
    )}.`,
  });

  redirect(bookingHref(bookingId, "stay-change=confirmed"));
}

export async function declineStayChangeTransfer(formData: FormData) {
  await requireStaffCalendarWrite();
  const bookingId = String(formData.get("booking-id") ?? "");

  const booking = await clearPendingStayChange(bookingId);
  if (booking) {
    await recordStaffChatMessage({
      booking,
      body: `We couldn’t find your transfer, so your stay is unchanged: ${booking.room_name}, ${formatStayDateRange(
        booking.arrival_date,
        booking.departure_date,
      )}. Reply here if you did send it.`,
    });
  }

  redirect(bookingHref(bookingId, "stay-change=declined"));
}

export async function markStayChangeRefundSent(formData: FormData) {
  await requireStaffCalendarWrite();
  const bookingId = String(formData.get("booking-id") ?? "");
  const amount = Number(formData.get("refund-amount") ?? 0);

  const booking = await clearStayChangeRefund(bookingId);
  if (booking && amount > 0) {
    const settings = await getPropertySettings();
    await recordStaffChatMessage({
      booking,
      body: `We’ve sent your refund of ${formatMoneySuffix(amount, settings.currency)} by bank transfer.`,
    });
  }

  redirect(bookingHref(bookingId, "stay-change=refund-sent"));
}
