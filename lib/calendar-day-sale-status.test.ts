import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countNetBookedForRoomDay,
  countUnassignedDoorHolds,
  guestSellableDoorCount,
} from "./calendar-timeline";

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

describe("countUnassignedDoorHolds", () => {
  it("holds one sellable door for a stay parked on No #", () => {
    const holds = countUnassignedDoorHolds({
      roomId: "garden",
      arrival: "2026-08-10",
      departure: "2026-08-12",
      bookings: [
        {
          roomId: "garden",
          roomUnitId: null,
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
        },
        {
          roomId: "garden",
          roomUnitId: "unit-112",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-12",
        },
      ],
      channelBlocks: [],
      typeUnitIds: new Set(["unit-112", "unit-117", "unit-119"]),
    });

    assert.equal(holds, 1);
    assert.equal(guestSellableDoorCount(1, holds), 0);
  });
});
