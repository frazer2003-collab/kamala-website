import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldNotifyChatCounterpart } from "./chat-notify";

describe("chat notify once until reply", () => {
  it("notifies on the first message in a thread", () => {
    assert.equal(
      shouldNotifyChatCounterpart({ sender: "guest", latestPriorSender: null }),
      true,
    );
    assert.equal(
      shouldNotifyChatCounterpart({ sender: "staff", latestPriorSender: null }),
      true,
    );
  });

  it("notifies when the other party spoke last", () => {
    assert.equal(
      shouldNotifyChatCounterpart({
        sender: "guest",
        latestPriorSender: "staff",
      }),
      true,
    );
    assert.equal(
      shouldNotifyChatCounterpart({
        sender: "staff",
        latestPriorSender: "guest",
      }),
      true,
    );
  });

  it("skips when the same party is still sending", () => {
    assert.equal(
      shouldNotifyChatCounterpart({
        sender: "guest",
        latestPriorSender: "guest",
      }),
      false,
    );
    assert.equal(
      shouldNotifyChatCounterpart({
        sender: "staff",
        latestPriorSender: "staff",
      }),
      false,
    );
  });
});
