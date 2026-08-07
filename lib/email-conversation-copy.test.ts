import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GUEST_CONVERSATION_BUTTON,
  GUEST_CONVERSATION_INSTRUCTION,
  guestConversationBlockText,
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
});
