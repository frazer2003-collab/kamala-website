import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Room } from "@/lib/content";
import { computeGuestNightAvailability } from "./guest-night-availability-core";

function room(overrides: Partial<Room> & Pick<Room, "id">): Room {
  return {
    name: overrides.id,
    shortName: overrides.id,
    rate: 700,
    sleeps: "2",
    outlook: "Garden",
    availableCount: 1,
    summary: "",
    amenities: [],
    tone: "garden",
    imageUrl: null,
    galleryUrls: [],
    ...overrides,
  };
}

describe("computeGuestNightAvailability", () => {
  it("marks nights open when any room type has inventory", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-06",
      bookings: [],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "open");
    assert.equal(nights["2026-09-06"], "open");
  });

  it("marks a night full when staff-closed and no other type is open", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "garden", startDate: "2026-09-05", endDate: "2026-09-06" },
      ],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "full");
  });

  it("stays open if another room type is free on a closed night", () => {
    const nights = computeGuestNightAvailability({
      rooms: [
        room({ id: "garden", availableCount: 1 }),
        room({ id: "courtyard", availableCount: 2 }),
      ],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "garden", startDate: "2026-09-05", endDate: "2026-09-06" },
      ],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "open");
  });

  it("marks sold-out nights full from allotment", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [
        {
          roomId: "garden",
          roomUnitId: null,
          arrivalDate: "2026-09-05",
          departureDate: "2026-09-06",
          databaseId: "b1",
          guest: "Ada",
        },
      ],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "full");
  });
});
