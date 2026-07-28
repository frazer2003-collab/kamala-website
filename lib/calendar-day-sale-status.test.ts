import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countNetBookedForRoomDay } from "./calendar-timeline";

describe("countNetBookedForRoomDay", () => {
  it("counts a stay on door 114 toward Family even when room_id is still Deluxe", () => {
    const netBooked = countNetBookedForRoomDay({
      roomId: "loft",
      iso: "2026-08-10",
      bookings: [
        {
          roomId: "garden",
          roomUnitId: "unit-114",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
        },
      ],
      channelBlocks: [],
      typeUnitIds: new Set(["unit-114"]),
    });

    assert.equal(netBooked, 1);
  });

  it("does not double-count a Family stay assigned to door 114", () => {
    const netBooked = countNetBookedForRoomDay({
      roomId: "loft",
      iso: "2026-08-10",
      bookings: [
        {
          roomId: "loft",
          roomUnitId: "unit-114",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
        },
      ],
      channelBlocks: [],
      typeUnitIds: new Set(["unit-114"]),
    });

    assert.equal(netBooked, 1);
  });
});
