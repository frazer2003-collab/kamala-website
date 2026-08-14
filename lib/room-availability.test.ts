import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRoomTypeAvailabilityCount,
  getRoomAvailabilityLabel,
  isRoomBookable,
} from "@/lib/room-availability";

describe("room availability labels", () => {
  it("treats positive counts as bookable", () => {
    assert.equal(isRoomBookable(0), false);
    assert.equal(isRoomBookable(1), true);
  });

  it("uses calm stay-date labels without scarcity wording", () => {
    assert.equal(formatRoomTypeAvailabilityCount(0), "Fully booked");
    assert.equal(formatRoomTypeAvailabilityCount(1), "1 room available");
    assert.equal(formatRoomTypeAvailabilityCount(3), "3 rooms available");
  });

  it("keeps generic inventory labels when dates are not set", () => {
    assert.equal(getRoomAvailabilityLabel(0), "Fully booked");
    assert.equal(getRoomAvailabilityLabel(1), "1 room available");
    assert.equal(getRoomAvailabilityLabel(4), "4 rooms available");
  });
});
