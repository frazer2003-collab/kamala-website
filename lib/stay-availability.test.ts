import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeGuestRoomStayAvailableCount,
  stayAvailabilityMap,
  type RoomStayAvailability,
} from "./stay-availability";
import { parseStayDates, refreshStaleStayDates } from "./stay-dates";
import { getPropertyTodayIso } from "./calendar";
import type { Room } from "./content";
import { SAMPLE_ROOM_UNITS } from "./room-units";

const gardenRoom: Room = {
  id: "garden",
  name: "Deluxe",
  shortName: "Deluxe",
  rate: 1900,
  availableCount: 4,
  sleeps: "Sleeps 2",
  outlook: "Garden",
  summary: "",
  amenities: [],
  tone: "garden",
  imageUrl: null,
  galleryUrls: [],
};

describe("stayAvailabilityMap", () => {
  it("maps room ids to available counts", () => {
    const entries: RoomStayAvailability[] = [
      { roomId: "garden", totalRooms: 2, availableCount: 1 },
      { roomId: "loft", totalRooms: 1, availableCount: 0 },
    ];

    assert.equal(stayAvailabilityMap(entries).get("garden"), 1);
    assert.equal(stayAvailabilityMap(entries).get("loft"), 0);
  });
});

describe("computeGuestRoomStayAvailableCount", () => {
  const arrival = "2026-08-10";
  const departure = "2026-08-12";

  it("returns zero when every door for the type is taken", () => {
    const gardenUnits = SAMPLE_ROOM_UNITS.filter((unit) =>
      unit.roomIds.includes("garden"),
    );
    assert.equal(gardenUnits.length, 3);

    const available = computeGuestRoomStayAvailableCount({
      room: gardenRoom,
      arrival,
      departure,
      bookings: gardenUnits.map((unit, index) => ({
        roomId: "garden",
        roomUnitId: unit.id,
        arrivalDate: arrival,
        departureDate: departure,
        databaseId: `b-${index}`,
        guest: `Guest ${index}`,
      })),
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(available, 0);
  });

  it("counts a door assigned under another room_id toward that door's type", () => {
    const unit114 = SAMPLE_ROOM_UNITS.find((unit) => unit.number === "114");
    assert.ok(unit114);

    const loftRoom: Room = {
      ...gardenRoom,
      id: "loft",
      name: "Family",
      shortName: "Family",
      availableCount: 1,
      rate: 2500,
      tone: "attic",
    };

    const available = computeGuestRoomStayAvailableCount({
      room: loftRoom,
      arrival,
      departure,
      bookings: [
        {
          roomId: "garden",
          roomUnitId: unit114.id,
          arrivalDate: arrival,
          departureDate: departure,
          databaseId: "cross-type",
          guest: "OTA guest",
        },
      ],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(available, 0);
  });

  it("caps allotment by free doors when catalog count is higher", () => {
    const gardenUnits = SAMPLE_ROOM_UNITS.filter((unit) =>
      unit.roomIds.includes("garden"),
    );
    const available = computeGuestRoomStayAvailableCount({
      room: gardenRoom,
      arrival,
      departure,
      bookings: gardenUnits.slice(0, 2).map((unit, index) => ({
        roomId: "garden",
        roomUnitId: unit.id,
        arrivalDate: arrival,
        departureDate: departure,
        databaseId: `b-${index}`,
        guest: `Guest ${index}`,
      })),
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(available, 1);
  });

  it("returns zero on a staff-closed night", () => {
    const available = computeGuestRoomStayAvailableCount({
      room: gardenRoom,
      arrival,
      departure,
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "garden", startDate: arrival, endDate: departure },
      ],
      inventoryLookup: new Map(),
      units: SAMPLE_ROOM_UNITS,
    });

    assert.equal(available, 0);
  });
});

describe("parseStayDates", () => {
  it("rejects arrivals before the property timezone today", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const yesterdayDate = new Date(year, month - 1, day - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    assert.equal(parseStayDates(yesterday, today), null);
  });

  it("accepts arrivals on property timezone today", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const tomorrowDate = new Date(year, month - 1, day + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

    const parsed = parseStayDates(today, tomorrow);
    assert.ok(parsed);
    assert.equal(parsed?.arrival, today);
    assert.equal(parsed?.departure, tomorrow);
  });
});

describe("refreshStaleStayDates", () => {
  it("rolls a past stay forward to today keeping night count", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const pastArrivalDate = new Date(year, month - 1, day - 5);
    const pastDepartureDate = new Date(year, month - 1, day - 2);
    const pastArrival = `${pastArrivalDate.getFullYear()}-${String(pastArrivalDate.getMonth() + 1).padStart(2, "0")}-${String(pastArrivalDate.getDate()).padStart(2, "0")}`;
    const pastDeparture = `${pastDepartureDate.getFullYear()}-${String(pastDepartureDate.getMonth() + 1).padStart(2, "0")}-${String(pastDepartureDate.getDate()).padStart(2, "0")}`;

    const refreshed = refreshStaleStayDates(pastArrival, pastDeparture);
    assert.ok(refreshed);
    assert.equal(refreshed?.arrival, today);
    assert.equal(refreshed?.nights, 3);

    const expectedDepartureDate = new Date(year, month - 1, day + 3);
    const expectedDeparture = `${expectedDepartureDate.getFullYear()}-${String(expectedDepartureDate.getMonth() + 1).padStart(2, "0")}-${String(expectedDepartureDate.getDate()).padStart(2, "0")}`;
    assert.equal(refreshed?.departure, expectedDeparture);
  });

  it("does not refresh a valid future stay", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const tomorrowDate = new Date(year, month - 1, day + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

    assert.equal(refreshStaleStayDates(today, tomorrow), null);
  });
});
