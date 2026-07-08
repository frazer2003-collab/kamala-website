"use server";

import { revalidatePath } from "next/cache";
import {
  getBookingByConversationToken,
  isChatReadOnly,
  listBookingMessages,
  recordGuestChatMessage,
  recordStaffChatMessage,
  toGuestChatContext,
  type ChatMessage,
} from "@/lib/booking-chat";
import { requireStaffSession } from "@/lib/staff-auth";
import { createStaffSupabaseClient } from "@/lib/supabase";

export type ChatActionState = {
  error?: string;
};

async function getStaffBooking(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function loadStaffBookingMessages(
  bookingId: string,
  after?: string,
): Promise<{ messages: ChatMessage[]; error?: string }> {
  await requireStaffSession();

  if (!bookingId) {
    return { messages: [], error: "Missing booking." };
  }

  const result = await listBookingMessages(bookingId, after);
  return { messages: result.messages, error: result.error ?? undefined };
}

export async function loadGuestBookingMessages(
  token: string,
  after?: string,
): Promise<{
  messages: ChatMessage[];
  context?: ReturnType<typeof toGuestChatContext>;
  readOnly?: boolean;
  error?: string;
}> {
  const booking = await getBookingByConversationToken(token);

  if (!booking) {
    return { messages: [], error: "This conversation link is not valid." };
  }

  const result = await listBookingMessages(booking.id, after);
  return {
    messages: result.messages,
    context: toGuestChatContext(booking),
    readOnly: isChatReadOnly(booking.status),
    error: result.error ?? undefined,
  };
}

export async function sendStaffChatMessage(
  _prevState: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  await requireStaffSession();

  const bookingId = String(formData.get("booking-id") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();

  if (!bookingId || !body) {
    return { error: "Enter a message before sending." };
  }

  const booking = await getStaffBooking(bookingId);
  if (!booking) {
    return { error: "Could not find this booking." };
  }

  if (booking.status === "declined") {
    return { error: "This conversation is closed." };
  }

  const result = await recordStaffChatMessage({ booking, body });
  if (!result.ok) {
    return { error: "Could not send your message. Try again." };
  }

  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  return {};
}

export async function sendGuestChatMessage(
  _prevState: ChatActionState,
  formData: FormData,
): Promise<ChatActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const body = String(formData.get("message") ?? "").trim();

  if (!token || !body) {
    return { error: "Enter a message before sending." };
  }

  const booking = await getBookingByConversationToken(token);
  if (!booking) {
    return { error: "This conversation link is not valid." };
  }

  if (isChatReadOnly(booking.status)) {
    return { error: "This conversation is closed." };
  }

  const result = await recordGuestChatMessage({
    booking,
    body,
    senderEmail: booking.guest_email,
  });

  if (!result.ok) {
    return { error: "Could not send your message. Try again." };
  }

  revalidatePath("/booking/messages");
  return {};
}
