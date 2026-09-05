import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBookingNoteSeedForNotify } from "./booking-chat";
import { shouldNotifyChatCounterpart } from "./chat-notify";

describe("guest chat staff email notify", () => {
  it("treats seeded booking notes as non-notifiable prior messages", () => {
    assert.equal(
      isBookingNoteSeedForNotify(
        {
          sender: "guest",
          body: "Late check-in please",
          source_email_id: "seed:booking-note:abc",
        },
        "Late check-in please",
      ),
      true,
    );
    assert.equal(
      isBookingNoteSeedForNotify(
        {
          sender: "guest",
          body: "Late check-in please",
          source_email_id: null,
        },
        "Late check-in please",
      ),
      true,
    );
    assert.equal(
      isBookingNoteSeedForNotify(
        {
          sender: "guest",
          body: "Hello from chat",
          source_email_id: null,
        },
        "Late check-in please",
      ),
      false,
    );
  });

  it("still emails staff for the first real guest chat after a seeded note", () => {
    // After ignoring the seed, prior sender is null → notify.
    assert.equal(
      shouldNotifyChatCounterpart({ sender: "guest", latestPriorSender: null }),
      true,
    );
  });
});
