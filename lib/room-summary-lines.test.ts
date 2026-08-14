import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRoomSummaryLines,
  matchRoomSummaryIcon,
  splitRoomSummarySentences,
} from "./room-summary-lines";

describe("splitRoomSummarySentences", () => {
  it("splits host copy on sentence boundaries", () => {
    assert.deepEqual(
      splitRoomSummarySentences(
        "A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet. Flexible king or twin setup for couples or friends.",
      ),
      [
        "A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet.",
        "Flexible king or twin setup for couples or friends.",
      ],
    );
  });

  it("keeps a single sentence as one line", () => {
    assert.deepEqual(splitRoomSummarySentences("A quiet garden room."), [
      "A quiet garden room.",
    ]);
  });

  it("returns nothing for blank copy", () => {
    assert.deepEqual(splitRoomSummarySentences("  "), []);
  });
});

describe("matchRoomSummaryIcon", () => {
  it("uses the earliest fact in the sentence", () => {
    assert.equal(
      matchRoomSummaryIcon(
        "A comfortable room a minute from Tha Phae Gate, with a private bathroom.",
      ),
      "location",
    );
    assert.equal(
      matchRoomSummaryIcon("Flexible king or twin setup for couples or friends."),
      "bed",
    );
    assert.equal(
      matchRoomSummaryIcon(
        "More space for longer stays: 45 sqm with a private balcony over the guesthouse garden.",
      ),
      "size",
    );
    assert.equal(
      matchRoomSummaryIcon(
        "A ground-floor family room with space for four guests, private bathroom, and easy access without stairs.",
      ),
      "ground",
    );
  });

  it("falls back to a room pictogram", () => {
    assert.equal(matchRoomSummaryIcon("A calm place to rest."), "room");
  });
});

describe("buildRoomSummaryLines", () => {
  it("pairs each sentence with a matching icon", () => {
    const lines = buildRoomSummaryLines(
      "Quiet room facing greenery above the old city. Refrigerator and en-suite bathroom.",
    );

    assert.deepEqual(lines, [
      { text: "Quiet room facing greenery above the old city.", icon: "quiet" },
      { text: "Refrigerator and en-suite bathroom.", icon: "fridge" },
    ]);
  });
});
