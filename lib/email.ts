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
};

type EmailResult =
  | { ok: true }
  | { ok: false; reason: "missing-config" | "send-failed" };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
    ? `Deposit paid: ${booking.roomName}`
    : `New booking request: ${booking.roomName}`;
  const note = booking.note || "No note added.";
  const text = [
    booking.depositPaid ? "Deposit paid — room reserved" : "New booking request",
    "",
    `Guest: ${booking.guestName}`,
    `Email: ${booking.guestEmail}`,
    `Phone: ${booking.guestPhone}`,
    `Room: ${booking.roomName}`,
    `Dates: ${booking.arrivalDate} to ${booking.departureDate}`,
    `Nights: ${booking.nights}`,
    `Estimated total: $${booking.estimatedTotal}`,
    booking.depositPaid ? `Deposit paid: $${booking.depositPaid}` : "",
    "",
    "Guest note:",
    note,
    "",
    "Open the staff bookings page to review and reply.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #24191b; line-height: 1.5;">
      <h1 style="font-size: 22px;">${booking.depositPaid ? "Deposit paid — room reserved" : "New booking request"}</h1>
      <p>${booking.depositPaid ? "A guest paid the 50% deposit and the room is reserved pending your review." : "A guest has requested a room through the Kamala website."}</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 8px 0; color: #6b5559;">Guest</td><td>${escapeHtml(booking.guestName)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Email</td><td>${escapeHtml(booking.guestEmail)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Phone</td><td>${escapeHtml(booking.guestPhone)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Room</td><td>${escapeHtml(booking.roomName)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Dates</td><td>${escapeHtml(booking.arrivalDate)} to ${escapeHtml(booking.departureDate)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Nights</td><td>${booking.nights}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b5559;">Estimated total</td><td>$${booking.estimatedTotal}</td></tr>
        ${booking.depositPaid ? `<tr><td style="padding: 8px 0; color: #6b5559;">Deposit paid</td><td>$${booking.depositPaid}</td></tr>` : ""}
      </table>
      <h2 style="font-size: 16px; margin-top: 24px;">Guest note</h2>
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

export async function sendGuestBookingEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: "missing-config" };
  }

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
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; color: #24191b; line-height: 1.5; max-width: 620px;">
          <p>${escapeHtml(body).replaceAll("\n", "<br />")}</p>
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
    `Open the conversation: ${staffUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #24191b; line-height: 1.5; max-width: 620px;">
      <h1 style="font-size: 20px;">New guest message</h1>
      <p><strong>${escapeHtml(guestName)}</strong> · ${escapeHtml(roomName)}<br />
      ${escapeHtml(arrivalDate)} to ${escapeHtml(departureDate)}</p>
      <p style="white-space: pre-wrap;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      <p><a href="${escapeHtml(staffUrl)}">Open the conversation on the staff site</a></p>
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
  kind?: "welcome" | "new-message";
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from) {
    return { ok: false, reason: "missing-config" };
  }

  const subject =
    kind === "welcome"
      ? `Your Kamala conversation link · ${roomName}`
      : `You have a new message about your stay · ${roomName}`;

  const text =
    kind === "welcome"
      ? [
          `Hello ${guestName},`,
          "",
          message,
          "",
          "Open your private conversation link:",
          chatUrl,
          "",
          "Please save this link. It is the only way to message us about this booking.",
        ].join("\n")
      : [
          `Hello ${guestName},`,
          "",
          "You have a new message from Kamala about your booking:",
          "",
          message,
          "",
          "Open your private conversation link to read and reply:",
          chatUrl,
          "",
          "Please use this link to respond — we cannot accept replies by email.",
        ].join("\n");

  const html =
    kind === "welcome"
      ? `
    <div style="font-family: Arial, sans-serif; color: #24191b; line-height: 1.5; max-width: 620px;">
      <p>Hello ${escapeHtml(guestName)},</p>
      <p style="white-space: pre-wrap;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      <p><a href="${escapeHtml(chatUrl)}" style="display: inline-block; padding: 12px 18px; background: #5c2f35; color: #fff; text-decoration: none; border-radius: 8px;">Open your conversation</a></p>
      <p style="color: #6b5559; font-size: 14px;">Please save this link. It is the only way to message us about this booking.</p>
    </div>
  `
      : `
    <div style="font-family: Arial, sans-serif; color: #24191b; line-height: 1.5; max-width: 620px;">
      <h1 style="font-size: 20px;">You have a new message</h1>
      <p>Hello ${escapeHtml(guestName)}, Kamala sent you a message about your ${escapeHtml(roomName)} stay.</p>
      <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #d9c5c8; background: #f8f3f4; white-space: pre-wrap;">${escapeHtml(message).replaceAll("\n", "<br />")}</blockquote>
      <p><a href="${escapeHtml(chatUrl)}" style="display: inline-block; padding: 12px 18px; background: #5c2f35; color: #fff; text-decoration: none; border-radius: 8px;">Open conversation and reply</a></p>
      <p style="color: #6b5559; font-size: 14px;">Please use your private link to respond — we cannot accept replies by email.</p>
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
      to,
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
