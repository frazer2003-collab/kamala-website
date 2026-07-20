import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  feedMatchesOtaChannel,
  otaChannelFromLabel,
  type RoomIcalFeed,
} from "./ota-ical-channel";

function feed(partial: Partial<RoomIcalFeed> & Pick<RoomIcalFeed, "label">): RoomIcalFeed {
  return {
    id: "1",
    roomId: "courtyard",
    roomUnitId: null,
    importUrl: "https://example.com/cal.ics",
    lastSyncedAt: null,
    lastSyncError: null,
    ...partial,
  };
}

describe("otaChannelFromLabel", () => {
  it("detects Airbnb, Booking.com, and Expedia prefixes", () => {
    assert.equal(otaChannelFromLabel("Airbnb 117"), "airbnb");
    assert.equal(otaChannelFromLabel("Booking.com · Courtyard"), "booking");
    assert.equal(otaChannelFromLabel("Expedia · Garden"), "expedia");
  });
});

describe("feedMatchesOtaChannel", () => {
  it("treats legacy unit feeds without a prefix as Airbnb", () => {
    assert.equal(
      feedMatchesOtaChannel(feed({ label: "Room 117", roomUnitId: "u1" }), "airbnb"),
      true,
    );
    assert.equal(
      feedMatchesOtaChannel(feed({ label: "Room 117", roomUnitId: "u1" }), "booking"),
      false,
    );
  });
});
