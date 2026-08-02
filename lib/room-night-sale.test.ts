import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Room } from "./content";
import { SAMPLE_ROOM_UNITS } from "./room-units";
import {
  explainRoomNightSale,
  formatRoomNightSaleReason,
} from "./room-night-sale";

const groundRoom: Room = {
  id: "ground",
  name: "Family Room Ground Floor",
  shortName: "Family GF",
  rate: 1100,
  sleeps: "Sleeps 4",
  outlook: "Ground floor",
  availableCount: 1,
  summary: "Ground floor family room",
  amenities: [],
  tone: "attic",
  imageUrl: "/rooms/family.jpg",
  galleryUrls: [],
};

describe("explainRoomNightSale", () => {
  it("flags staff closures that leave door rows empty", () => {
    const reason = explainRoomNightSale({
      room: groundRoom,
      iso: "2026-08-02",
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "ground", startDate: "2026-08-02", endDate: "2026-08-03" },
      ],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(reason.kind, "staff-closed");
    assert.match(formatRoomNightSaleReason(reason) ?? "", /Closed/);
  });

  it("flags allotment zero without needing a stay bar", () => {
    const reason = explainRoomNightSale({
      room: groundRoom,
      iso: "2026-08-02",
      bookings: [],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map([["ground:2026-08-02", 0]]),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(reason.kind, "allotment-zero");
  });

  it("flags type sold-out from an unassigned stay", () => {
    const reason = explainRoomNightSale({
      room: groundRoom,
      iso: "2026-08-02",
      bookings: [
        {
          roomId: "ground",
          roomUnitId: null,
          arrivalDate: "2026-08-02",
          departureDate: "2026-08-03",
        },
      ],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(reason.kind, "sold-out");
    assert.match(formatRoomNightSaleReason(reason) ?? "", /Needs room/);
  });
});
