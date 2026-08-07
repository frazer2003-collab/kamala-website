/**
 * Guest-facing conversation CTA copy for booking/chat emails.
 * Keep this free of HTML chrome so copy can change without email CSS noise.
 */

export const GUEST_CONVERSATION_BUTTON = "Open conversation";

/** Shown with every guest chat link — do not reply by email. */
export const GUEST_CONVERSATION_INSTRUCTION =
  "Please do not reply to this email — we will not see it. Click Open conversation to message us about your stay.";

export function guestConversationBlockText(chatUrl: string) {
  return [
    GUEST_CONVERSATION_INSTRUCTION,
    "",
    `${GUEST_CONVERSATION_BUTTON}:`,
    chatUrl,
  ].join("\n");
}
