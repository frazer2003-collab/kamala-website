import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHAT_PRESENCE_TTL_MS,
  isChatViewerPresent,
} from "@/lib/chat-presence";
import { isRecipientPresentOnChat } from "@/lib/booking-chat";

describe("chat presence", () => {
  it("treats a recent heartbeat as present", () => {
    const now = Date.parse("2026-08-07T12:00:00.000Z");
    assert.equal(
      isChatViewerPresent(new Date(now - 10_000).toISOString(), now),
      true,
    );
  });

  it("treats a stale heartbeat as away", () => {
    const now = Date.parse("2026-08-07T12:00:00.000Z");
    assert.equal(
      isChatViewerPresent(
        new Date(now - CHAT_PRESENCE_TTL_MS - 1).toISOString(),
        now,
      ),
      false,
    );
    assert.equal(isChatViewerPresent(null, now), false);
  });

  it("maps guest/staff columns for recipient checks", () => {
    const booking = {
      guest_chat_present_at: new Date().toISOString(),
      staff_chat_present_at: null,
    };
    assert.equal(isRecipientPresentOnChat(booking, "guest"), true);
    assert.equal(isRecipientPresentOnChat(booking, "staff"), false);
  });
});
