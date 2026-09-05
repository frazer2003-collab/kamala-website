import {
  EMAIL,
  EMAIL_FONT_BODY,
  EMAIL_FONT_DISPLAY,
  emailNl2br,
  escapeHtml,
} from "@/lib/email-theme";
import { guestConversationBlockHtml } from "@/lib/guest-email-conversation";

export type GuestChatEmailKind = "welcome" | "new-message" | "confirmation";

function brandHeaderHtml() {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="padding:0 0 20px;border-bottom:1px solid ${EMAIL.border};">
      <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${EMAIL.maroon};">
        Kamala
      </p>
      <p style="margin:6px 0 0;font-family:${EMAIL_FONT_BODY};font-size:12px;line-height:1.3;color:${EMAIL.muted};">
        Guesthouse · Chiang Mai
      </p>
    </td>
  </tr>
</table>`.trim();
}

function messagePanelHtml(message: string) {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0;">
  <tr>
    <td style="padding:16px 18px;background-color:${EMAIL.maroonWash};border-radius:12px;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">
      ${emailNl2br(message)}
    </td>
  </tr>
</table>`.trim();
}

function guestEmailShell(inner: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:${EMAIL.canvas};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${EMAIL.canvas};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:${EMAIL.surface};border:1px solid ${EMAIL.border};border-radius:16px;">
          <tr>
            <td style="padding:28px 28px 32px;">
              ${brandHeaderHtml()}
              ${inner}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildGuestChatNotificationCopy(input: {
  kind: GuestChatEmailKind;
  guestName: string;
  roomName: string;
  message: string;
}): { subject: string; headline: string; introHtml: string; introText: string } {
  const name = input.guestName.trim() || "there";
  const room = input.roomName.trim() || "your room";

  if (input.kind === "welcome") {
    return {
      subject: `Your Kamala conversation · ${room}`,
      headline: "Your conversation is ready",
      introHtml: `<p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">Hello ${escapeHtml(name)},</p>
      <p style="margin:12px 0 0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">Use the link below anytime you need to reach us about your stay.</p>`,
      introText: `Hello ${name},\n\nUse the link below anytime you need to reach us about your stay.`,
    };
  }

  if (input.kind === "confirmation") {
    return {
      subject: `Your stay is confirmed · ${room}`,
      headline: "Your stay is confirmed",
      introHtml: `<p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">Hello ${escapeHtml(name)},</p>
      <p style="margin:12px 0 0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">Your <strong>${escapeHtml(room)}</strong> booking is confirmed. A note from us:</p>`,
      introText: `Hello ${name},\n\nYour ${room} booking is confirmed.`,
    };
  }

  return {
    subject: `New message from Kamala · ${room}`,
    headline: "A message from Kamala",
    introHtml: `<p style="margin:0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">Hello ${escapeHtml(name)},</p>
    <p style="margin:12px 0 0;font-family:${EMAIL_FONT_BODY};font-size:16px;line-height:1.55;color:${EMAIL.ink};">We sent you a note about your <strong>${escapeHtml(room)}</strong> stay.</p>`,
    introText: `Hello ${name},\n\nWe sent you a note about your ${room} stay:`,
  };
}

/** HTML for guest chat / stay emails — hex colors, table layout, maroon pill CTA. */
export function buildGuestChatNotificationHtml(input: {
  kind: GuestChatEmailKind;
  guestName: string;
  roomName: string;
  message: string;
  chatUrl: string;
}) {
  const copy = buildGuestChatNotificationCopy(input);
  const showMessage = Boolean(input.message.trim());

  const inner = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
  <tr>
    <td>
      <h1 style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${EMAIL.ink};">
        ${escapeHtml(copy.headline)}
      </h1>
    </td>
  </tr>
  <tr>
    <td style="padding-top:16px;">
      ${copy.introHtml}
    </td>
  </tr>
  ${
    showMessage
      ? `<tr><td>${messagePanelHtml(input.message)}</td></tr>`
      : ""
  }
  <tr>
    <td>
      ${guestConversationBlockHtml(input.chatUrl)}
    </td>
  </tr>
</table>`.trim();

  return guestEmailShell(inner);
}
