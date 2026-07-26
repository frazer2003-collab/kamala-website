import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatInboxMessageAge,
  pickLatestMessagePreviews,
  truncateInboxPreview,
} from "./booking-chat";

describe("staff inbox message previews", () => {
  it("truncates long previews on a single line", () => {
    const long = "Hello  there,\ncan we  change to a later arrival please?";
    const preview = truncateInboxPreview(long, 40);

    assert.equal(preview.includes("\n"), false);
    assert.ok(preview.endsWith("…"));
    assert.ok(preview.length <= 40);
  });

  it("keeps short previews intact", () => {
    assert.equal(truncateInboxPreview("Thanks"), "Thanks");
  });

  it("formats relative ages for the inbox", () => {
    const now = Date.parse("2026-07-26T12:00:00.000Z");

    assert.equal(
      formatInboxMessageAge("2026-07-26T11:40:00.000Z", now),
      "20m ago",
    );
    assert.equal(
      formatInboxMessageAge("2026-07-26T09:00:00.000Z", now),
      "3h ago",
    );
    assert.equal(
      formatInboxMessageAge("2026-07-24T12:00:00.000Z", now),
      "2d ago",
    );
  });

  it("keeps only the latest message per booking", () => {
    const previews = pickLatestMessagePreviews(
      [
        {
          booking_request_id: "a",
          sender: "guest",
          body: "Newer guest note",
          created_at: "2026-07-26T11:00:00.000Z",
        },
        {
          booking_request_id: "a",
          sender: "staff",
          body: "Older staff reply",
          created_at: "2026-07-26T10:00:00.000Z",
        },
        {
          booking_request_id: "b",
          sender: "staff",
          body: "Only for B",
          created_at: "2026-07-26T09:00:00.000Z",
        },
      ],
      Date.parse("2026-07-26T12:00:00.000Z"),
    );

    assert.equal(previews.get("a")?.sender, "guest");
    assert.equal(previews.get("a")?.bodyPreview, "Newer guest note");
    assert.equal(previews.get("b")?.bodyPreview, "Only for B");
    assert.equal(previews.size, 2);
  });
});
