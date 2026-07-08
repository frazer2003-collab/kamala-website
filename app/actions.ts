"use server";

import { randomUUID } from "node:crypto";
import { createStaffSupabaseClient } from "@/lib/supabase";
import { sendGuestBookingEmail } from "@/lib/email";
import { recordStaffChatMessage, seedGuestNoteMessage } from "@/lib/booking-chat";
import { getStripeCurrencyCode } from "@/lib/currency";
import { getPropertySettings } from "@/lib/property-settings";
import { requireStaffSession } from "@/lib/staff-auth";
import { hasCapacityForStay, getUnavailableStayDays } from "@/lib/booking-capacity";
import { appendOverlapErrorToHref } from "@/lib/stay-overlap";
import { releaseBookingReservation } from "@/lib/booking-payments";
import { PUBLIC_CACHE_TAGS, revalidatePublicCache } from "@/lib/public-cache";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRoomForBooking } from "@/lib/rooms";
import { isPastCalendarDate } from "@/lib/calendar";
import { addIsoDays } from "@/lib/room-day-inventory";
import { calculateStayQuote, type StayQuote } from "@/lib/pricing";
import { getRoomPromotionsForStay } from "@/lib/room-promotions";
import { isRoomBookable } from "@/lib/room-availability";
import { isStayStatus } from "@/lib/stay-status";
import {
  calculateDepositAmount,
  createDepositPaymentIntent,
  getStripe,
  hasStripeConfig,
  hasStripeServerConfig,
} from "@/lib/stripe";

export type BookingFormValues = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  arrival: string;
  departure: string;
  note: string;
};

export type BookingActionState = {
  status: "idle" | "payment_ready" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  values?: BookingFormValues;
  payment?: {
    clientSecret: string;
    bookingId: string;
  };
};

export type BookingQuoteResult = StayQuote & {
  baseNightlyRate: number;
  effectiveNightlyRate: number | null;
  promoLabel: string | null;
};

const emptyQuote: BookingQuoteResult = {
  nights: 0,
  total: 0,
  baseTotal: 0,
  promoNights: 0,
  hasPromotion: false,
  baseNightlyRate: 0,
  effectiveNightlyRate: null,
  promoLabel: null,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && value.length <= 30;
}

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function redirectIfStayOverlaps(
  href: string,
  roomId: string,
  arrival: string,
  departure: string,
  availableCount: number,
  options?: { excludeBookingId?: string; excludeBlockId?: string },
) {
  const unavailableDays = await getUnavailableStayDays(
    roomId,
    arrival,
    departure,
    availableCount,
    options,
  );

  if (unavailableDays.length > 0) {
    redirect(appendOverlapErrorToHref(href, unavailableDays));
  }
}

function getBookingFormValues(formData: FormData): BookingFormValues {
  return {
    guestName: getValue(formData, "guest-name"),
    guestEmail: getValue(formData, "guest-email").toLowerCase(),
    guestPhone: getValue(formData, "guest-phone"),
    roomId: getValue(formData, "room"),
    arrival: getValue(formData, "arrival"),
    departure: getValue(formData, "departure"),
    note: getValue(formData, "guest-note"),
  };
}

function bookingErrorState(
  message: string,
  formData: FormData,
  fieldErrors?: Record<string, string>,
): BookingActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    values: getBookingFormValues(formData),
  };
}

function getBookingInsertErrorMessage(error: { message?: string; code?: string }) {
  const message = error.message ?? "";

  if (
    message.includes("deposit_amount") ||
    message.includes("pending_payment") ||
    message.includes("booking_requests_status_check")
  ) {
    return "Database needs the Stripe deposit migration. Run supabase/migrate-stripe-deposit.sql in Supabase, then try again.";
  }

  if (message.includes("guest_phone")) {
    return "Database needs the guest phone migration. Run supabase/migrate-guest-phone.sql in Supabase, then try again.";
  }

  if (error.code === "42501" || message.toLowerCase().includes("row-level security")) {
    return "Database permissions blocked the booking. Run the latest files in supabase/ on your Supabase project, then try again.";
  }

  return "We could not save the request. Check the booking details or try again in a moment.";
}

export async function getBookingQuote(
  roomId: string,
  arrival: string,
  departure: string,
): Promise<BookingQuoteResult> {
  const room = await getRoomForBooking(roomId);
  if (!room) {
    return emptyQuote;
  }

  if (!arrival || !departure || departure <= arrival) {
    return {
      ...emptyQuote,
      baseNightlyRate: room.rate,
    };
  }

  const promotions = await getRoomPromotionsForStay(roomId, arrival, departure);
  const quote = calculateStayQuote({
    roomId,
    baseRate: room.rate,
    arrival,
    departure,
    promotions,
  });

  return {
    ...quote,
    baseNightlyRate: room.rate,
    effectiveNightlyRate:
      quote.nights > 0 ? Math.round(quote.total / quote.nights) : null,
    promoLabel: quote.hasPromotion
      ? promotions.find((promotion) => promotion.label)?.label ??
        `${Math.round(((quote.baseTotal - quote.total) / quote.baseTotal) * 100)}% off`
      : null,
  };
}

export async function createBookingRequest(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const guestName = getValue(formData, "guest-name");
  const guestEmail = getValue(formData, "guest-email").toLowerCase();
  const guestPhone = getValue(formData, "guest-phone");
  const roomId = getValue(formData, "room");
  const arrival = getValue(formData, "arrival");
  const departure = getValue(formData, "departure");
  const note = getValue(formData, "guest-note");
  const propertySettings = await getPropertySettings();
  const selectedRoom = await getRoomForBooking(roomId);
  const arrivalDate = parseDate(arrival);
  const departureDate = parseDate(departure);
  const fieldErrors: Record<string, string> = {};

  if (guestName.length < 2) {
    fieldErrors["guest-name"] = "Please enter the guest name.";
  }

  if (!guestEmail) {
    fieldErrors["guest-email"] = "Enter an email address staff can reply to.";
  } else if (!emailPattern.test(guestEmail)) {
    fieldErrors["guest-email"] = "Enter a valid email address.";
  }

  if (!guestPhone) {
    fieldErrors["guest-phone"] = "Enter a phone number staff can reach you on.";
  } else if (!isValidPhone(guestPhone)) {
    fieldErrors["guest-phone"] = "Enter a valid phone number with at least 7 digits.";
  }

  if (!selectedRoom) {
    fieldErrors.room = "Choose one of the listed rooms.";
  }

  if (!arrivalDate) {
    fieldErrors.arrival = "Choose an arrival date.";
  }

  if (!departureDate) {
    fieldErrors.departure = "Choose a departure date.";
  }

  if (arrivalDate && departureDate && departureDate <= arrivalDate) {
    fieldErrors.departure = "Departure must be after arrival.";
  }

  if (selectedRoom && !isRoomBookable(selectedRoom.availableCount)) {
    fieldErrors.room = "This room is full. Choose another room or ask about flexible dates in your note.";
  }

  if (Object.keys(fieldErrors).length > 0 || !selectedRoom || !arrivalDate || !departureDate) {
    return bookingErrorState(
      "Please fix the highlighted details before sending the request.",
      formData,
      fieldErrors,
    );
  }

  const nights = Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1 || nights > 21) {
    return bookingErrorState(
      "Stays can be requested for 1 to 21 nights.",
      formData,
      { departure: "Choose a stay between 1 and 21 nights." },
    );
  }

  if (!hasStripeConfig()) {
    return bookingErrorState(
      "Card payments are not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY before accepting bookings.",
      formData,
    );
  }

  const promotions = await getRoomPromotionsForStay(selectedRoom.id, arrival, departure);
  const quote = calculateStayQuote({
    roomId: selectedRoom.id,
    baseRate: selectedRoom.rate,
    arrival,
    departure,
    promotions,
  });
  const estimatedTotal = quote.total;
  const depositAmount = calculateDepositAmount(estimatedTotal);

  const hasCapacity = await hasCapacityForStay(
    selectedRoom.id,
    arrival,
    departure,
    selectedRoom.availableCount,
  );

  if (!hasCapacity) {
    return bookingErrorState(
      "These dates are no longer available for this room.",
      formData,
      { room: "These dates are no longer available for this room." },
    );
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data: booking, error } = await supabase
      .from("booking_requests")
      .insert({
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        room_id: selectedRoom.id,
        room_name: selectedRoom.name,
        arrival_date: arrival,
        departure_date: departure,
        nights,
        estimated_total: estimatedTotal,
        deposit_amount: depositAmount,
        note: note || null,
        status: "pending_payment",
        conversation_token: randomUUID(),
      })
      .select("id")
      .single();

    if (error || !booking) {
      console.error("createBookingRequest insert failed:", error);
      return bookingErrorState(getBookingInsertErrorMessage(error ?? {}), formData);
    }

    const { data: createdBooking } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("id", booking.id)
      .single();

    if (createdBooking) {
      await seedGuestNoteMessage(createdBooking);
    }

    const paymentIntent = await createDepositPaymentIntent({
      bookingId: booking.id,
      guestEmail,
      roomName: selectedRoom.name,
      arrival,
      departure,
      depositAmount,
      currency: propertySettings.currency,
      propertyName: propertySettings.propertyName,
      hasPromotion: quote.hasPromotion,
    });

    if (!paymentIntent.client_secret) {
      await supabase
        .from("booking_requests")
        .delete()
        .eq("id", booking.id)
        .eq("status", "pending_payment");

      return bookingErrorState(
        "We could not start card payment. Please try again in a moment.",
        formData,
      );
    }

    await supabase
      .from("booking_requests")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);

    return {
      status: "payment_ready",
      message: "",
      values: getBookingFormValues(formData),
      payment: {
        clientSecret: paymentIntent.client_secret,
        bookingId: booking.id,
      },
    };
  } catch {
    return bookingErrorState(
      "Supabase or Stripe is not configured yet. Add your environment variables before sending real requests.",
      formData,
    );
  }
}

export async function cancelPendingBooking(bookingId: string) {
  if (!bookingId) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("stripe_payment_intent_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "pending_payment") {
    return;
  }

  if (booking.stripe_payment_intent_id && hasStripeServerConfig()) {
    try {
      await getStripe().paymentIntents.cancel(booking.stripe_payment_intent_id);
    } catch {
      // Intent may already be canceled or completed.
    }
  }

  await supabase
    .from("booking_requests")
    .delete()
    .eq("id", bookingId)
    .eq("status", "pending_payment");
}

async function getBookingForStaff(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function confirmBookingRequest(formData: FormData) {
  await requireStaffSession();

  const bookingId = getValue(formData, "booking-id");
  const message =
    getValue(formData, "staff-message") ||
    "Good news — your room is confirmed. We will follow up with arrival details and the remaining balance shortly.";

  const booking = await getBookingForStaff(bookingId);
  if (!booking) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .update({ status: "confirmed" })
    .eq("id", bookingId);

  await recordStaffChatMessage({
    booking: { ...booking, status: "confirmed" },
    body: message,
  });

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  redirect(
    `/staff/calendar?month=${booking.arrival_date.slice(0, 7)}&booking=${encodeURIComponent(bookingId)}`,
  );
}

export async function updateConfirmedBooking(
  bookingId: string,
  formData: FormData,
) {
  await requireStaffSession();

  const month = getValue(formData, "month");
  const arrival = getValue(formData, "arrival");
  const departure = getValue(formData, "departure");
  const staffNote = getValue(formData, "staff-note");
  const stayStatus = getValue(formData, "stay-status");
  const guestName = getValue(formData, "guest-name");
  const guestPhone = getValue(formData, "guest-phone");
  const guestEmailInput = getValue(formData, "guest-email").toLowerCase();
  const guestEmail = guestEmailInput || walkInEmailFallback;
  const booking = await getBookingForStaff(bookingId);

  if (!bookingId || !booking || booking.status !== "confirmed" || booking.id !== bookingId) {
    redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
  }

  const bookingMonth = month || booking.arrival_date.slice(0, 7);
  const bookingHref = `/staff/calendar?month=${bookingMonth}&booking=${encodeURIComponent(bookingId)}`;

  if (!isStayStatus(stayStatus)) {
    redirect(bookingHref);
  }

  if (guestName.length < 2) {
    redirect(`${bookingHref}&error=invalid-name`);
  }

  if (!isValidPhone(guestPhone)) {
    redirect(`${bookingHref}&error=invalid-phone`);
  }

  const arrivalDate = parseDate(arrival);
  const departureDate = parseDate(departure);

  if (!arrivalDate || !departureDate || departureDate <= arrivalDate) {
    redirect(`${bookingHref}&error=invalid-dates`);
  }

  const nights = Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1 || nights > 21) {
    redirect(`${bookingHref}&error=invalid-dates`);
  }

  const room = await getRoomForBooking(booking.room_id);
  if (room) {
    await redirectIfStayOverlaps(
      bookingHref,
      booking.room_id,
      arrival,
      departure,
      room.availableCount,
      { excludeBookingId: bookingId },
    );
  }

  const promotions = await getRoomPromotionsForStay(booking.room_id, arrival, departure);
  const quote = calculateStayQuote({
    roomId: booking.room_id,
    baseRate:
      room?.rate ?? Math.max(1, Math.round(booking.estimated_total / Math.max(booking.nights, 1))),
    arrival,
    departure,
    promotions,
  });
  const estimatedTotal = quote.total;
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("booking_requests")
    .update({
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      arrival_date: arrival,
      departure_date: departure,
      nights,
      estimated_total: estimatedTotal,
      staff_note: staffNote || null,
      stay_status: stayStatus,
    })
    .eq("id", bookingId);

  if (error) {
    redirect(`${bookingHref}&error=save-failed`);
  }

  revalidatePath("/staff/calendar");
  redirect(
    `/staff/calendar?month=${arrival.slice(0, 7)}&booking=${encodeURIComponent(bookingId)}&saved=1`,
  );
}

export async function declineBookingRequest(formData: FormData) {
  await requireStaffSession();

  const bookingId = getValue(formData, "booking-id");
  const message =
    getValue(formData, "staff-message") ||
    "Thank you for your request. We are sorry, but this room is not available for those dates. Reply with flexible dates and we can help find another option.";

  const booking = await getBookingForStaff(bookingId);
  if (!booking) {
    return;
  }

  if (booking.deposit_paid_at && booking.stripe_payment_intent_id && hasStripeConfig()) {
    try {
      await getStripe().refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
      });
    } catch {
      // Refund failure should not block staff from declining the request.
    }
    await releaseBookingReservation(bookingId);
  }

  if (booking.guest_email !== "walk-in@kamala.local") {
    await sendGuestBookingEmail({
      to: booking.guest_email,
      subject: "Update about your Kamala booking request",
      body: message,
    });
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("booking_requests").delete().eq("id", bookingId);

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  redirect("/staff");
}

export async function cancelConfirmedBooking(
  bookingId: string,
  month: string,
  _formData: FormData,
) {
  await requireStaffSession();

  const booking = await getBookingForStaff(bookingId);

  if (!bookingId || !booking || booking.status !== "confirmed" || booking.id !== bookingId) {
    redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
  }

  const supabase = createStaffSupabaseClient();

  if (booking.deposit_paid_at) {
    await releaseBookingReservation(bookingId);
  } else {
    const room = await getRoomForBooking(booking.room_id);
    if (room) {
      await supabase
        .from("rooms")
        .update({ available_count: room.availableCount + 1 })
        .eq("id", booking.room_id);
    }
  }

  await supabase
    .from("booking_requests")
    .update({ status: "declined" })
    .eq("id", bookingId);

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
}

const walkInEmailFallback = "walk-in@kamala.local";

function formatBookingEmailDate(iso: string) {
  const parsed = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export async function createWalkInBooking(formData: FormData) {
  await requireStaffSession();

  const month = getValue(formData, "month");
  const roomId = getValue(formData, "room-id");
  const guestName = getValue(formData, "guest-name");
  const guestPhone = getValue(formData, "guest-phone");
  const guestEmail = getValue(formData, "guest-email").toLowerCase() || walkInEmailFallback;
  const arrival = getValue(formData, "arrival");
  const departure = getValue(formData, "departure");
  const staffNote = getValue(formData, "staff-note");
  const room = await getRoomForBooking(roomId);
  const arrivalDate = parseDate(arrival);
  const departureDate = parseDate(departure);

  if (!room || !arrivalDate || !departureDate || departureDate <= arrivalDate) {
    redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
  }

  if (isPastCalendarDate(arrival)) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in&error=past-date`,
    );
  }

  if (guestName.length < 2) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in&error=invalid-name`,
    );
  }

  if (!isValidPhone(guestPhone)) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in&error=invalid-phone`,
    );
  }

  const nights = Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1 || nights > 21) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in&error=invalid-dates`,
    );
  }

  const walkInHref = `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in`;
  await redirectIfStayOverlaps(
    walkInHref,
    roomId,
    arrival,
    departure,
    room.availableCount,
  );

  const promotions = await getRoomPromotionsForStay(room.id, arrival, departure);
  const quote = calculateStayQuote({
    roomId: room.id,
    baseRate: room.rate,
    arrival,
    departure,
    promotions,
  });

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      room_id: room.id,
      room_name: room.name,
      arrival_date: arrival,
      departure_date: departure,
      nights,
      estimated_total: quote.total,
      note: "Walk-in booking",
      staff_note: staffNote || null,
      status: "confirmed",
      stay_status: "checked-in",
      conversation_token: randomUUID(),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(arrival)}&mode=walk-in&error=save-failed`,
    );
  }

  await supabase
    .from("rooms")
    .update({ available_count: Math.max(0, room.availableCount - 1) })
    .eq("id", room.id);

  if (guestEmail !== walkInEmailFallback) {
    const settings = await getPropertySettings();
    const propertyName = settings.propertyName || "Kamala";
    const arrivalLabel = formatBookingEmailDate(arrival);
    const departureLabel = formatBookingEmailDate(departure);
    const body = [
      `Hello ${guestName},`,
      "",
      `Your booking at ${propertyName} is confirmed. We look forward to welcoming you.`,
      "",
      `Room: ${room.name}`,
      `Check-in: ${arrivalLabel}`,
      `Check-out: ${departureLabel}`,
      `Nights: ${nights}`,
      settings.checkInFrom ? `Check-in time: from ${settings.checkInFrom}` : "",
      "",
      "If any of these details look wrong, just reply to this email and we will help.",
    ]
      .filter(Boolean)
      .join("\n");

    await sendGuestBookingEmail({
      to: guestEmail,
      subject: `Your booking at ${propertyName} is confirmed`,
      body,
    });
  }

  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  redirect(
    `/staff/calendar?month=${arrival.slice(0, 7)}&booking=${encodeURIComponent(data.id)}&created=walk-in`,
  );
}

export async function createRoomBlock(formData: FormData) {
  await requireStaffSession();

  const month = getValue(formData, "month");
  const roomId = getValue(formData, "room-id");
  const startDate = getValue(formData, "start-date");
  const endDate = getValue(formData, "end-date");
  const reason = getValue(formData, "reason");
  const staffNote = getValue(formData, "staff-note");
  const room = await getRoomForBooking(roomId);
  const arrivalDate = parseDate(startDate);
  const departureDate = parseDate(endDate);

  if (!room || !arrivalDate || !departureDate || departureDate <= arrivalDate) {
    redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
  }

  if (isPastCalendarDate(startDate)) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(startDate)}&mode=block&error=past-date`,
    );
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("room_blocks")
    .insert({
      room_id: room.id,
      start_date: startDate,
      end_date: endDate,
      reason: reason || "Closed",
      staff_note: staffNote || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&date=${encodeURIComponent(startDate)}&mode=block&error=save-failed`,
    );
  }

  revalidatePath("/staff/calendar");
  redirect(
    `/staff/calendar?month=${startDate.slice(0, 7)}&block=${encodeURIComponent(data.id)}&created=block`,
  );
}

export async function updateChannelReservation(
  blockId: string,
  month: string,
  formData: FormData,
) {
  await requireStaffSession();

  const monthKey = month || "";
  const fallbackHref = monthKey
    ? `/staff/calendar?month=${monthKey}`
    : "/staff/calendar";

  if (!blockId) {
    redirect(fallbackHref);
  }

  const supabase = createStaffSupabaseClient();
  const { data: block } = await supabase
    .from("room_blocks")
    .select("id, ical_feed_id, room_id")
    .eq("id", blockId)
    .maybeSingle();

  if (!block || !block.ical_feed_id) {
    redirect(fallbackHref);
  }

  const blockHref = `/staff/calendar?month=${monthKey}&block=${encodeURIComponent(blockId)}`;
  const room = await getRoomForBooking(block.room_id);

  const guestName = getValue(formData, "guest-name");
  const guestPhone = getValue(formData, "guest-phone");
  const guestEmail = getValue(formData, "guest-email").toLowerCase();
  const arrival = getValue(formData, "arrival");
  const departure = getValue(formData, "departure");
  const staffNote = getValue(formData, "staff-note");

  if (guestName && guestName.length < 2) {
    redirect(`${blockHref}&error=invalid-name`);
  }

  if (guestPhone && !isValidPhone(guestPhone)) {
    redirect(`${blockHref}&error=invalid-phone`);
  }

  if (guestEmail && !emailPattern.test(guestEmail)) {
    redirect(`${blockHref}&error=invalid-email`);
  }

  const arrivalDate = parseDate(arrival);
  const departureDate = parseDate(departure);

  if (!arrivalDate || !departureDate || departureDate <= arrivalDate) {
    redirect(`${blockHref}&error=invalid-dates`);
  }

  const nights = Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1 || nights > 60) {
    redirect(`${blockHref}&error=invalid-dates`);
  }

  if (room) {
    await redirectIfStayOverlaps(
      blockHref,
      block.room_id,
      arrival,
      departure,
      room.availableCount,
      { excludeBlockId: blockId },
    );
  }

  const { error } = await supabase
    .from("room_blocks")
    .update({
      guest_name: guestName || null,
      guest_email: guestEmail || null,
      guest_phone: guestPhone || null,
      start_date: arrival,
      end_date: departure,
      staff_note: staffNote || null,
    })
    .eq("id", blockId);

  if (error) {
    redirect(`${blockHref}&error=save-failed`);
  }

  revalidatePath("/staff/calendar");
  redirect(
    `/staff/calendar?month=${arrival.slice(0, 7)}&block=${encodeURIComponent(blockId)}&saved=1`,
  );
}

export async function removeRoomBlock(blockId: string, month: string, _formData: FormData) {
  await requireStaffSession();

  if (!blockId) {
    redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
  }

  const supabase = createStaffSupabaseClient();
  await supabase.from("room_blocks").delete().eq("id", blockId);

  revalidatePath("/staff/calendar");
  redirect(month ? `/staff/calendar?month=${month}` : "/staff/calendar");
}

export async function bulkUpdateRoomAvailability(formData: FormData) {
  await requireStaffSession();

  const month = getValue(formData, "month");
  const roomId = getValue(formData, "room-id");
  const startDate = getValue(formData, "start-date");
  const endDateInclusive = getValue(formData, "end-date");
  const action = getValue(formData, "availability-action");
  const reason = getValue(formData, "reason");
  const staffNote = getValue(formData, "staff-note");
  const room = await getRoomForBooking(roomId);
  const start = parseDate(startDate);
  const endInclusive = parseDate(endDateInclusive);

  const bulkStatusHref = month
    ? `/staff/calendar?month=${month}&room=${encodeURIComponent(roomId)}&mode=bulk-status`
    : "/staff/calendar";

  if (
    !room ||
    !start ||
    !endInclusive ||
    endInclusive < start ||
    (action !== "close" && action !== "open")
  ) {
    redirect(`${bulkStatusHref}&error=invalid-dates`);
  }

  if (isPastCalendarDate(startDate)) {
    redirect(`${bulkStatusHref}&error=past-date`);
  }

  const endExclusive = addIsoDays(endDateInclusive, 1);
  const supabase = createStaffSupabaseClient();

  if (action === "close") {
    const { error } = await supabase.from("room_blocks").insert({
      room_id: room.id,
      start_date: startDate,
      end_date: endExclusive,
      reason: reason || "Closed",
      staff_note: staffNote || null,
    });

    if (error) {
      redirect(`${bulkStatusHref}&error=save-failed`);
    }

    revalidatePath("/staff/calendar");
    redirect(`/staff/calendar?month=${month}&saved=bulk-status`);
  }

  const { data: overlappingBlocks, error: loadError } = await supabase
    .from("room_blocks")
    .select("id, start_date, end_date, reason, staff_note")
    .eq("room_id", room.id)
    .is("ical_feed_id", null)
    .lt("start_date", endExclusive)
    .gt("end_date", startDate);

  if (loadError) {
    redirect(`${bulkStatusHref}&error=save-failed`);
  }

  for (const block of overlappingBlocks ?? []) {
    const { error: deleteError } = await supabase
      .from("room_blocks")
      .delete()
      .eq("id", block.id);

    if (deleteError) {
      redirect(`${bulkStatusHref}&error=save-failed`);
    }

    const remnants: Array<{
      room_id: string;
      start_date: string;
      end_date: string;
      reason: string | null;
      staff_note: string | null;
    }> = [];

    if (block.start_date < startDate) {
      remnants.push({
        room_id: room.id,
        start_date: block.start_date,
        end_date: startDate,
        reason: block.reason,
        staff_note: block.staff_note,
      });
    }

    if (block.end_date > endExclusive) {
      remnants.push({
        room_id: room.id,
        start_date: endExclusive,
        end_date: block.end_date,
        reason: block.reason,
        staff_note: block.staff_note,
      });
    }

    if (remnants.length > 0) {
      const { error: insertError } = await supabase.from("room_blocks").insert(remnants);
      if (insertError) {
        redirect(`${bulkStatusHref}&error=save-failed`);
      }
    }
  }

  revalidatePath("/staff/calendar");
  redirect(`/staff/calendar?month=${month}&saved=bulk-status`);
}
