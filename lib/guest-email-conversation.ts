/**
 * Guest-facing conversation CTA copy for booking/chat emails.
 * Keep this free of HTML chrome so copy can change without email CSS noise.
 */

import {
  EMAIL,
  EMAIL_FONT_BODY,
  escapeHtml,
} from "@/lib/email-theme";

export const GUEST_CONVERSATION_BUTTON = "Open conversation";

/** Shown with every guest chat link — do not reply by email. */
export const GUEST_CONVERSATION_INSTRUCTION =
  "Please do not reply to this email — we will not see it. Click Open conversation to message us about your stay.";

/** Shorter line for the HTML footer (CTA already carries the action). */
export const GUEST_CONVERSATION_FOOTNOTE =
  "Replies to this email are not delivered. Use Open conversation to message Kamala about your stay.";

export function guestConversationBlockText(chatUrl: string) {
  return [
    GUEST_CONVERSATION_INSTRUCTION,
    "",
    `${GUEST_CONVERSATION_BUTTON}:`,
    chatUrl,
  ].join("\n");
}

/** Bulletproof pill CTA — bgcolor + hex so Gmail keeps the maroon button. */
export function guestConversationButtonHtml(chatUrl: string) {
  const href = escapeHtml(chatUrl);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
  <tr>
    <td align="center" bgcolor="${EMAIL.maroon}" style="background-color:${EMAIL.maroon};border-radius:999px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${EMAIL_FONT_BODY};font-size:16px;font-weight:700;line-height:1.2;color:${EMAIL.white};text-decoration:none;border-radius:999px;">
        ${GUEST_CONVERSATION_BUTTON}
      </a>
    </td>
  </tr>
</table>`.trim();
}

export function guestConversationBlockHtml(chatUrl: string) {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
  <tr>
    <td align="left">
      ${guestConversationButtonHtml(chatUrl)}
    </td>
  </tr>
  <tr>
    <td style="padding-top:16px;font-family:${EMAIL_FONT_BODY};font-size:13px;line-height:1.45;color:${EMAIL.muted};">
      ${escapeHtml(GUEST_CONVERSATION_FOOTNOTE)}
    </td>
  </tr>
</table>`.trim();
}
