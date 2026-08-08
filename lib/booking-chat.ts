import { randomUUID } from "node:crypto";
import { shouldNotifyChatCounterpart } from "@/lib/chat-notify";
import {
  sendGuestChatNotificationEmail,
  sendStaffChatNotificationEmail,
} from "@/lib/email";
import { getAppBaseUrl } from "@/lib/stripe";
import {
  nextStatusAfterGuestMessage,
  nextStatusAfterStaffReply,
} from "@/lib/staff-calendar-stay";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type BookingMessageRow,
  type BookingRequestRow,
} from "@/lib/supabase";

export type ChatMessage = {
  id: string;
  sender: BookingMessageRow["sender"];
  body: string;
  createdAt: string;
};

export type InboxMessagePreview = {
  bookingRequestId: string;
  sender: BookingMessageRow["sender"];
  bodyPreview: string;
  createdAt: string;
  ageLabel: string;
};

const INBOX_PREVIEW_MAX_CHARS = 72;

export function truncateInboxPreview(
  body: string,
  maxChars = INBOX_PREVIEW_MAX_CHARS,
) {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (!oneLine) {
    return "";
  }

  if (oneLine.length <= maxChars) {
    return oneLine;
  }

  return `${oneLine.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function formatInboxMessageAge(createdAt: string, nowMs = Date.now()) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return "Recently";
  }

  const minutes = Math.max(1, Math.round((nowMs - created.getTime()) / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(created);
}

export function pickLatestMessagePreviews(
  rows: Array<{
    booking_request_id: string;
    sender: BookingMessageRow["sender"];
    body: string;
    created_at: string;
  }>,
  nowMs = Date.now(),
) {
  const previews = new Map<string, InboxMessagePreview>();

  for (const row of rows) {
    if (previews.has(row.booking_request_id)) {
      continue;
    }

    previews.set(row.booking_request_id, {
      bookingRequestId: row.booking_request_id,
      sender: row.sender,
      bodyPreview: truncateInboxPreview(row.body),
      createdAt: row.created_at,
      ageLabel: formatInboxMessageAge(row.created_at, nowMs),
    });
  }

  return previews;
}

/** Latest message snippet per booking for the staff inbox list. */
export async function getInboxMessagePreviews(bookingIds: string[]) {
  const uniqueIds = [...new Set(bookingIds.filter(Boolean))];
  if (uniqueIds.length === 0 || !hasStaffSupabaseConfig()) {
    return new Map<string, InboxMessagePreview>();
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_messages")
    .select("booking_request_id, sender, body, created_at")
    .in("booking_request_id", uniqueIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(uniqueIds.length * 8, 400));

  if (error || !data) {
    return new Map<string, InboxMessagePreview>();
  }

  return pickLatestMessagePreviews(data);
}

/** Booking IDs that have at least one message in the thread. */
export async function getBookingsWithConversationMessages(bookingIds: string[]) {
  const uniqueIds = [...new Set(bookingIds.filter(Boolean))];
  if (uniqueIds.length === 0 || !hasStaffSupabaseConfig()) {
    return new Set<string>();
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_messages")
    .select("booking_request_id")
    .in("booking_request_id", uniqueIds);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set(data.map((row) => row.booking_request_id));
}

export type GuestChatContext = {
  guestName: string;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
};

export const WALK_IN_GUEST_EMAIL = "walk-in@kamala.local";

export function guestHasConversationLink(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === WALK_IN_GUEST_EMAIL) {
    return false;
  }
  // Minimal shape check — avoids treating blank/placeholder as a real guest inbox.
  return normalized.includes("@") && normalized.includes(".");
}

const CHAT_ACTIVE_STATUSES: BookingRequestRow["status"][] = [
  "awaiting",
  "confirmed",
  "needs-reply",
];

/** Statuses where a conversation token link must open for the guest. */
export const CHAT_GUEST_ACCESS_STATUSES: BookingRequestRow["status"][] = [
  "new",
  "pending_payment",
  "awaiting",
  "confirmed",
  "needs-reply",
  "declined",
];

export function isChatReadOnly(status: BookingRequestRow["status"]) {
  return status === "declined";
}

export function guestCanAccessChat(status: BookingRequestRow["status"]) {
  return CHAT_GUEST_ACCESS_STATUSES.includes(status);
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

export async function resolveGuestConversationUrl({
  bookingId,
  conversationToken,
  guestEmail,
}: {
  bookingId: string;
  conversationToken: string | null;
  guestEmail: string;
}) {
  if (!guestHasConversationLink(guestEmail)) {
    return null;
  }

  const token = conversationToken ?? (await ensureConversationToken(bookingId));
  return token ? getGuestChatUrl(token) : null;
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

  if (!guestHasConversationLink(data.guest_email)) {
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
  const nextStatus = nextStatusAfterGuestMessage(booking.status);
  if (!nextStatus) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .update({ status: nextStatus })
    .eq("id", booking.id);
}

async function markStaffReplied(booking: BookingRequestRow) {
  const nextStatus = nextStatusAfterStaffReply(
    booking.status,
    Boolean(booking.deposit_paid_at),
  );
  if (!nextStatus) {
    return;
  }

  const supabase = createStaffSupabaseClient();
  await supabase
    .from("booking_requests")
    .update({ status: nextStatus })
    .eq("id", booking.id);
}

/**
 * Staff closes a finished conversation: wipe message history and clear
 * needs-reply. Does not email the guest.
 */
export async function closeBookingConversation(booking: BookingRequestRow) {
  if (!hasStaffSupabaseConfig() || !booking.id) {
    return { ok: false as const, reason: "missing-config" as const };
  }

  if (booking.status === "declined") {
    return { ok: false as const, reason: "closed" as const };
  }

  const supabase = createStaffSupabaseClient();
  const { error: deleteError } = await supabase
    .from("booking_messages")
    .delete()
    .eq("booking_request_id", booking.id);

  if (deleteError) {
    return { ok: false as const, reason: "delete-failed" as const };
  }

  const nextStatus = nextStatusAfterStaffReply(
    booking.status,
    Boolean(booking.deposit_paid_at),
  );

  if (nextStatus) {
    const { error: statusError } = await supabase
      .from("booking_requests")
      .update({ status: nextStatus })
      .eq("id", booking.id);

    if (statusError) {
      return { ok: false as const, reason: "status-failed" as const };
    }
  }

  return {
    ok: true as const,
    nextStatus: nextStatus ?? booking.status,
  };
}

function staffChatDeepLink(booking: BookingRequestRow) {
  const month = booking.arrival_date.slice(0, 7);
  const params = new URLSearchParams({
    month,
    from: booking.arrival_date,
    to: booking.departure_date,
    booking: booking.id,
  });
  return `${getAppBaseUrl()}/staff/calendar?${params.toString()}`;
}

async function getLatestMessageSender(bookingId: string) {
  if (!hasStaffSupabaseConfig() || !bookingId) {
    return null;
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("booking_messages")
    .select("sender")
    .eq("booking_request_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.sender as BookingMessageRow["sender"];
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

  const latestPriorSender = await getLatestMessageSender(booking.id);
  const shouldNotify =
    !skipNotify &&
    shouldNotifyChatCounterpart({
      sender: "guest",
      latestPriorSender,
    });

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
  if (shouldNotify) {
    const notify = await sendStaffChatNotificationEmail({
      bookingRef: getBookingRef(booking.id),
      guestName: booking.guest_name,
      roomName: booking.room_name,
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      message: trimmed,
      staffUrl: staffChatDeepLink(booking),
    });
    emailSent = notify.ok;
  }

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
  emailKind = "new-message",
}: {
  booking: BookingRequestRow;
  body: string;
  senderEmail?: string;
  skipNotify?: boolean;
  emailKind?: "welcome" | "new-message" | "confirmation";
}) {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false as const, reason: "empty-body" as const };
  }

  const supabase = createStaffSupabaseClient();
  const latestPriorSender = await getLatestMessageSender(booking.id);
  // Confirmation / welcome always email — they carry the chat link.
  const mustEmail = emailKind === "confirmation" || emailKind === "welcome";
  const shouldNotify =
    !skipNotify &&
    guestHasConversationLink(booking.guest_email) &&
    (mustEmail ||
      shouldNotifyChatCounterpart({
        sender: "staff",
        latestPriorSender,
      }));

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
  if (shouldNotify) {
    const token = await ensureConversationToken(booking.id);
    if (!token) {
      emailSent = false;
    } else {
      const notify = await sendGuestChatNotificationEmail({
        to: booking.guest_email,
        guestName: booking.guest_name,
        roomName: booking.room_name,
        message: trimmed,
        chatUrl: getGuestChatUrl(token),
        kind: emailKind,
      });
      emailSent = notify.ok;
    }
  }

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
