import { formatBedSetup, parseBedSetup } from "@/lib/bed-setup";
import {
  buildGuestChatNotificationCopy,
  buildGuestChatNotificationHtml,
} from "@/lib/guest-chat-email";
import {
  guestConversationBlockHtml,
  guestConversationBlockText,
} from "@/lib/guest-email-conversation";
import { EMAIL_FONT_BODY, escapeHtml } from "@/lib/email-theme";
import { getStaffNotificationRecipients } from "@/lib/staff-notification-emails";

type StaffBookingEmail = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  estimatedTotal: number;
  note: string;
  depositPaid?: number;
  bedSetup?: string | null;
};

type EmailResult =
  | { ok: true }
  | { ok: false; reason: "missing-config" | "send-failed" };

const EMAIL_FONT = EMAIL_FONT_BODY;

export async function sendStaffBookingEmail(
  booking: StaffBookingEmail,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  const staffRecipients = await getStaffNotificationRecipients();

  if (!apiKey || !from || staffRecipients.length === 0) {
    return { ok: false, reason: "missing-config" };
  }

  const subject = booking.depositPaid
    ? `Paid in full: ${booking.roomName}`
    : `New booking request: ${booking.roomName}`;
  const note = booking.note || "No note added.";
  const headline = booking.depositPaid
    ? "Paid in full — room reserved"
    : "New booking request";
  const intro = booking.depositPaid
    ? "A guest paid the full stay and the room is reserved pending your review."
    : "A guest has requested a room through the Kamala website.";
  const bedSetupLabel = parseBedSetup(booking.bedSetup ?? undefined);
  const text = [
    headline,
    "",
    intro,
    "",
    `Guest: ${booking.guestName}`,
    `Email: ${booking.guestEmail}`,
    `Phone: ${booking.guestPhone}`,
    `Room: ${booking.roomName}`,
    `Dates: ${booking.arrivalDate} to ${booking.departureDate}`,
    `Nights: ${booking.nights}`,
    bedSetupLabel ? `Bed setup: ${formatBedSetup(bedSetupLabel)}` : "",
    `Stay total: $${booking.estimatedTotal}`,
    booking.depositPaid ? `Amount paid: $${booking.depositPaid}` : "",
    "",
    "Guest note:",
    note,
    "",
    "Open Requests → Payment to review and reply.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: ${EMAIL_FONT}; color: oklch(22% 0.025 12); line-height: 1.5;">
      <h1 style="font-size: 1.25rem;">${escapeHtml(headline)}</h1>
      <p>${escapeHtml(intro)}</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Guest</td><td>${escapeHtml(booking.guestName)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Email</td><td>${escapeHtml(booking.guestEmail)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Phone</td><td>${escapeHtml(booking.guestPhone)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Room</td><td>${escapeHtml(booking.roomName)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Dates</td><td>${escapeHtml(booking.arrivalDate)} to ${escapeHtml(booking.departureDate)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Nights</td><td>${booking.nights}</td></tr>
        ${
          bedSetupLabel
            ? `<tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Bed setup</td><td>${escapeHtml(
                formatBedSetup(bedSetupLabel),
              )}</td></tr>`
            : ""
        }
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Stay total</td><td>$${booking.estimatedTotal}</td></tr>
        ${booking.depositPaid ? `<tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Amount paid</td><td>$${booking.depositPaid}</td></tr>` : ""}
      </table>
      <h2 style="font-size: 1rem; margin-top: 24px;">Guest note</h2>
      <p>${escapeHtml(note)}</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: staffRecipients,
      reply_to: booking.guestEmail,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "send-failed" };
  }

  return { ok: true };
}

export async function sendStaffContactMessageEmail({
  propertyName,
  to,
  guestName,
  guestEmail,
  guestPhone,
  message,
}: {
  propertyName: string;
  to: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  message: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from || !to.trim()) {
    return { ok: false, reason: "missing-config" };
  }

  const subject = `Website message: ${guestName}`;
  const phoneLine = guestPhone.trim() || "Not provided";
  const text = [
    `New message from the ${propertyName} contact page.`,
    "",
    `Guest: ${guestName}`,
    `Email: ${guestEmail}`,
    `Phone: ${phoneLine}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const html = `
    <div style="font-family: ${EMAIL_FONT}; color: oklch(22% 0.025 12); line-height: 1.5; max-width: 620px;">
      <h1 style="font-size: 1.25rem;">Website message</h1>
      <p>A guest wrote through the ${escapeHtml(propertyName)} contact page.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Guest</td><td>${escapeHtml(guestName)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Email</td><td>${escapeHtml(guestEmail)}</td></tr>
        <tr><td style="padding: 8px 0; color: oklch(46% 0.022 12);">Phone</td><td>${escapeHtml(phoneLine)}</td></tr>
      </table>
      <h2 style="font-size: 1rem; margin-top: 24px;">Message</h2>
      <p style="white-space: pre-wrap;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to.trim()],
      reply_to: guestEmail,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "send-failed" };
  }

  return { ok: true };
}

export async function sendGuestBookingEmail({
  to,
  subject,
  body,
  chatUrl,
}: {
  to: string;
  subject: string;
  body: string;
  chatUrl?: string | null;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: "missing-config" };
  }

  const text = chatUrl
    ? [body, "", guestConversationBlockText(chatUrl)].join("\n")
    : body;

  const chatHtml = chatUrl ? guestConversationBlockHtml(chatUrl) : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html: `
        <div style="font-family: ${EMAIL_FONT}; color: #251617; line-height: 1.5; max-width: 620px;">
          <p>${escapeHtml(body).replaceAll("\n", "<br />")}</p>
          ${chatHtml}
        </div>
      `,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "send-failed" };
  }

  return { ok: true };
}

export async function sendStaffChatNotificationEmail({
  bookingRef,
  guestName,
  roomName,
  arrivalDate,
  departureDate,
  message,
  staffUrl,
}: {
  bookingRef: string;
  guestName: string;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
  message: string;
  staffUrl: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;
  const staffRecipients = await getStaffNotificationRecipients();

  if (!apiKey || !from || staffRecipients.length === 0) {
    return { ok: false, reason: "missing-config" };
  }

  const subject = `[Kamala #${bookingRef}] Guest reply · ${roomName}`;
  const text = [
    "New guest message",
    "",
    `Guest: ${guestName}`,
    `Room: ${roomName}`,
    `Dates: ${arrivalDate} to ${departureDate}`,
    "",
    message,
    "",
    `Reply on staff site: ${staffUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: ${EMAIL_FONT}; color: oklch(22% 0.025 12); line-height: 1.5; max-width: 620px;">
      <h1 style="font-size: 1.25rem;">New guest message</h1>
      <p><strong>${escapeHtml(guestName)}</strong> · ${escapeHtml(roomName)}<br />
      ${escapeHtml(arrivalDate)} to ${escapeHtml(departureDate)}</p>
      <p style="white-space: pre-wrap;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      <p><a href="${escapeHtml(staffUrl)}">Reply on staff site</a></p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: staffRecipients,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "send-failed" };
  }

  return { ok: true };
}

export async function sendGuestChatNotificationEmail({
  to,
  guestName,
  roomName,
  message,
  chatUrl,
  kind = "new-message",
}: {
  to: string;
  guestName: string;
  roomName: string;
  message: string;
  chatUrl: string;
  kind?: "welcome" | "new-message" | "confirmation";
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: "missing-config" };
  }

  const copy = buildGuestChatNotificationCopy({
    kind,
    guestName,
    roomName,
    message,
  });

  const text = [
    copy.introText,
    message.trim() ? "" : null,
    message.trim() || null,
    "",
    guestConversationBlockText(chatUrl),
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = buildGuestChatNotificationHtml({
    kind,
    guestName,
    roomName,
    message,
    chatUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: copy.subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "send-failed" };
  }

  return { ok: true };
}
