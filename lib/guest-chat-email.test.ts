import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGuestChatNotificationCopy,
  buildGuestChatNotificationHtml,
} from "./guest-chat-email";
import { EMAIL } from "./email-theme";
import {
  GUEST_CONVERSATION_BUTTON,
  GUEST_CONVERSATION_INSTRUCTION,
  guestConversationBlockText,
  guestConversationButtonHtml,
} from "./guest-email-conversation";

describe("guest email conversation copy", () => {
  it("tells guests not to reply by email and to open the conversation", () => {
    assert.equal(GUEST_CONVERSATION_BUTTON, "Open conversation");
    assert.match(GUEST_CONVERSATION_INSTRUCTION, /do not reply to this email/i);
    assert.match(GUEST_CONVERSATION_INSTRUCTION, /Open conversation/);
    assert.match(GUEST_CONVERSATION_INSTRUCTION, /we will not see it/i);

    const block = guestConversationBlockText("https://www.example.com/chat");
    assert.match(block, /do not reply to this email/i);
    assert.match(block, /Open conversation:/);
    assert.match(block, /https:\/\/www\.example\.com\/chat/);
  });

  it("renders a hex maroon pill button Gmail can keep", () => {
    const html = guestConversationButtonHtml("https://www.kamalaguesthouse.com/chat");
    assert.match(html, new RegExp(`bgcolor="${EMAIL.maroon}"`));
    assert.match(html, /border-radius:999px/);
    assert.match(html, /Open conversation/);
    assert.doesNotMatch(html, /oklch/i);
  });
});

describe("guest chat notification email", () => {
  it("uses warm copy and branded HTML for new messages", () => {
    const copy = buildGuestChatNotificationCopy({
      kind: "new-message",
      guestName: "Jongjit",
      roomName: "Superior Double or Twin Room",
      message: "hi",
    });
    assert.match(copy.subject, /New message from Kamala/);
    assert.equal(copy.headline, "A message from Kamala");
    assert.match(copy.introText, /Jongjit/);

    const html = buildGuestChatNotificationHtml({
      kind: "new-message",
      guestName: "Jongjit",
      roomName: "Superior Double or Twin Room",
      message: "hi",
      chatUrl: "https://www.kamalaguesthouse.com/booking/abc/chat",
    });

    assert.match(html, /Kamala/);
    assert.match(html, /A message from Kamala/);
    assert.match(html, /\bhi\b/);
    assert.match(html, new RegExp(EMAIL.maroon));
    assert.match(html, /Open conversation/);
    assert.doesNotMatch(html, /oklch/i);
    assert.doesNotMatch(html, /border-left:\s*3px/);
  });
});
