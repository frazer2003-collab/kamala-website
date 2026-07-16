import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  sendGuestChatNotificationEmail,
  sendStaffChatNotificationEmail,
} from "@/lib/email";
import { getAppBaseUrl } from "@/lib/stripe";
import {
  createStaffSupabaseClient,
  type BookingMessageRow,
  type BookingRequestRow,
} from "@/lib/supabase";

export type ChatMessage = {
  id: string;
  sender: BookingMessageRow["sender"];
  body: string;
  createdAt: string;
};

export type GuestChatContext = {
  guestName: string;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
};

const CHAT_ACTIVE_STATUSES: BookingRequestRow["status"][] = [
  "awaiting",
  "confirmed",
  "needs-reply",
];

const CHAT_GUEST_ACCESS_STATUSES: BookingRequestRow["status"][] = [
  ...CHAT_ACTIVE_STATUSES,
  "declined",
];

export function isChatReadOnly(status: BookingRequestRow["status"]) {
  return status === "declined";
}

export function getBookingRef(bookingId: string) {
  return bookingId.slice(0, 8).toUpperCase();
}

export function buildChatEmailSubject(booking: {
  id: string;
  room_name?: string;
}) {
  const ref = getBookingRef(booking.id);
  return `[Kamala #${ref}] Message about ${booking.room_name ?? "your stay"}`;
}

export function getGuestChatUrl(token: string) {
  return `${getAppBaseUrl()}/booking/messages?token=${encodeURIComponent(token)}`;
}

export function parseBookingRefFromSubject(subject: string) {
  const match = subject.match(/\[Kamala #([A-F0-9]{8})\]/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function parseEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export function extractReplyBody(text: string) {
  const lines = text.split(/\r?\n/);
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^On .+ wrote:$/i.test(trimmed)) {
      break;
    }

    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(trimmed)) {
      break;
    }

    if (/^From:/i.test(trimmed) && cleaned.length > 0) {
      break;
    }

    if (/^>/.test(line)) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

function mapChatMessage(row: BookingMessageRow): ChatMessage {
  return {
    id: row.id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function ensureConversationToken(bookingId: string) {
  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("conversation_token")
    .eq("id", bookingId)
    .maybeSingle();

  if (booking?.conversation_token) {
    return booking.conversation_token;
  }

  const token = randomUUID();
  const { data: updated, error } = await supabase
    .from("booking_requests")
    .update({ conversation_token: token })
    .eq("id", bookingId)
    .select("conversation_token")
    .single();

  if (error || !updated?.conversation_token) {
    return null;
  }

  return updated.conversation_token;
}

export async function getBookingByConversationToken(token: string) {
  if (!token.trim()) {
    return null;
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("conversation_token", token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (!CHAT_GUEST_ACCESS_STATUSES.includes(data.status)) {
    return null;
  }

  return data;
}

export async function getBookingByRef(ref: string) {
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("*")
    .ilike("id", `${ref.toLowerCase()}%`)
    .limit(5);

  if (error || !data?.length) {
    return null;
  }

  const booking =
    data.find((row) => getBookingRef(row.id) === ref.toUpperCase()) ?? null;

  if (!booking || !CHAT_ACTIVE_STATUSES.includes(booking.status)) {
    return null;
  }

  return booking;
}

export async function seedGuestNoteMessage(booking: BookingRequestRow) {
  const note = booking.note?.trim();
  if (!note) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  const { data: existing } = await supabase
    .from("booking_messages")
    .select("id")
    .eq("booking_request_id", booking.id)
    .eq("sender", "guest")
    .eq("body", note)
    .maybeSingle();

  if (existing) {
    return;
  }

  await supabase.from("booking_messages").insert({
    booking_request_id: booking.id,
    sender: "guest",
    sender_email: booking.guest_email,
    body: note,
    source_email_id: null,
    created_at: booking.created_at,
  });
}

async function ensureConversationSeeded(bookingRequestId: string) {
  const supabase = createStaffSupabaseClient();
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", bookingRequestId)
    .maybeSingle();

  if (!booking) {
    return;
  }

  await seedGuestNoteMessage(booking);
}

export async function listBookingMessages(
  bookingRequestId: string,
  after?: string,
) {
  if (!after) {
    await ensureConversationSeeded(bookingRequestId);
  }

  const supabase = createStaffSupabaseClient();
  let query = supabase
    .from("booking_messages")
    .select("*")
    .eq("booking_request_id", bookingRequestId)
    .order("created_at", { ascending: true });

  if (after) {
    query = query.gt("created_at", after);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { messages: [] as ChatMessage[], error: "Could not load messages." };
  }

  return { messages: data.map(mapChatMessage), error: null };
}

async function markNeedsReply(booking: BookingRequestRow) {
  if (booking.status === "confirmed" || booking.status === "needs-reply") {
    return;
  }

  if (booking.status !== "awaiting") {
    return;
  }

  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .update({ status: "needs-reply" })
    .eq("id", booking.id);
}

async function markStaffReplied(booking: BookingRequestRow) {
  if (booking.status !== "needs-reply") {
    return;
  }

  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .update({ status: "awaiting" })
    .eq("id", booking.id);
}

function revalidateChatPaths() {
  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  revalidatePath("/booking/messages");
}

export async function recordGuestChatMessage({
  booking,
  body,
  senderEmail,
  sourceEmailId,
  skipNotify = false,
}: {
  booking: BookingRequestRow;
  body: string;
  senderEmail?: string;
  sourceEmailId?: string;
  skipNotify?: boolean;
}) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false as const, reason: "empty-body" as const };
  }

  const supabase = createStaffSupabaseClient();

  if (sourceEmailId) {
    const { data: existing } = await supabase
      .from("booking_messages")
      .select("id")
      .eq("source_email_id", sourceEmailId)
      .maybeSingle();

    if (existing) {
      return { ok: true as const, duplicate: true as const };
    }
  }

  const { data: message, error } = await supabase
    .from("booking_messages")
    .insert({
      booking_request_id: booking.id,
      sender: "guest",
      sender_email: senderEmail ?? booking.guest_email,
      body: trimmed,
      source_email_id: sourceEmailId ?? null,
    })
    .select("*")
    .single();

  if (error || !message) {
    return { ok: false as const, reason: "insert-failed" as const };
  }

  await markNeedsReply(booking);

  let emailSent: boolean | null = null;

  if (!skipNotify) {
    const notify = await sendStaffChatNotificationEmail({
      bookingRef: getBookingRef(booking.id),
      guestName: booking.guest_name,
      roomName: booking.room_name,
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      message: trimmed,
      staffUrl: `${getAppBaseUrl()}/staff?booking=${encodeURIComponent(booking.id)}#booking-chat`,
    });
    emailSent = notify.ok;
  }

  revalidateChatPaths();

  return {
    ok: true as const,
    message: mapChatMessage(message),
    emailSent,
  };
}

export async function recordStaffChatMessage({
  booking,
  body,
  senderEmail,
  skipNotify = false,
}: {
  booking: BookingRequestRow;
  body: string;
  senderEmail?: string;
  skipNotify?: boolean;
}) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false as const, reason: "empty-body" as const };
  }

  const supabase = createStaffSupabaseClient();
  const { data: message, error } = await supabase
    .from("booking_messages")
    .insert({
      booking_request_id: booking.id,
      sender: "staff",
      sender_email: senderEmail ?? null,
      body: trimmed,
      source_email_id: null,
    })
    .select("*")
    .single();

  if (error || !message) {
    return { ok: false as const, reason: "insert-failed" as const };
  }

  await markStaffReplied(booking);

  let emailSent: boolean | null = null;

  if (!skipNotify && booking.guest_email !== "walk-in@kamala.local") {
    const token = (await ensureConversationToken(booking.id)) ?? "";
    const chatUrl = token ? getGuestChatUrl(token) : getAppBaseUrl();

    const notify = await sendGuestChatNotificationEmail({
      to: booking.guest_email,
      guestName: booking.guest_name,
      roomName: booking.room_name,
      message: trimmed,
      chatUrl,
    });
    emailSent = notify.ok;
  }

  revalidateChatPaths();

  return {
    ok: true as const,
    message: mapChatMessage(message),
    emailSent,
  };
}

export async function fetchInboundEmailContent(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    text?: string;
    html?: string;
  };

  return {
    text: payload.text ?? "",
    html: payload.html ?? "",
  };
}

export async function importInboundEmailReply({
  from,
  subject,
  text,
  emailId,
}: {
  from: string;
  subject: string;
  text: string;
  emailId: string;
}) {
  const senderEmail = parseEmailAddress(from);
  const bookingRef = parseBookingRefFromSubject(subject);
  let booking =
    bookingRef ? await getBookingByRef(bookingRef) : null;

  if (!booking) {
    const supabase = createStaffSupabaseClient();
    const { data } = await supabase
      .from("booking_requests")
      .select("*")
      .eq("guest_email", senderEmail)
      .in("status", CHAT_ACTIVE_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1);

    booking = data?.[0] ?? null;
  }

  if (!booking) {
    return { ok: false as const, reason: "booking-not-found" as const };
  }

  if (booking.guest_email.toLowerCase() !== senderEmail) {
    return { ok: false as const, reason: "sender-mismatch" as const };
  }

  const body = extractReplyBody(text);
  if (!body) {
    return { ok: false as const, reason: "empty-body" as const };
  }

  return recordGuestChatMessage({
    booking,
    body,
    senderEmail,
    sourceEmailId: emailId,
  });
}

export function toGuestChatContext(booking: BookingRequestRow): GuestChatContext {
  return {
    guestName: booking.guest_name,
    roomName: booking.room_name,
    arrivalDate: booking.arrival_date,
    departureDate: booking.departure_date,
  };
}
