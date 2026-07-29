import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_ROOM_UNITS,
  applyDefaultRoomIds,
  getPrimaryRoomIdForUnit,
  getTimelineDoorUnits,
  getTimelineUnitsForRoomType,
  getTypeUnitIdSet,
  getUnitsForRoomType,
  hasAssignableUnitForStay,
  occupancyFromBooking,
} from "@/lib/room-units";

describe("getTimelineUnitsForRoomType", () => {
  it("assigns door 114 to Family only", () => {
    const garden = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map((unit) => unit.number);
    const loft = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map((unit) => unit.number);

    assert.deepEqual(garden, ["112", "117", "119"]);
    assert.deepEqual(loft, ["114"]);
  });

  it("shows the same units on the timeline as assignment", () => {
    const garden = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map(
      (unit) => unit.number,
    );
    const loft = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map(
      (unit) => unit.number,
    );

    assert.deepEqual(garden, getUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map((unit) => unit.number));
    assert.deepEqual(loft, getUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map((unit) => unit.number));
  });

  it("does not expose the retired Triple room type", () => {
    assert.deepEqual(getUnitsForRoomType(SAMPLE_ROOM_UNITS, "veranda"), []);
    assert.deepEqual(getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "veranda"), []);
  });

  it("leaves Superior and Family Ground Floor rows unchanged", () => {
    assert.deepEqual(
      getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "courtyard").map((unit) => unit.number),
      getUnitsForRoomType(SAMPLE_ROOM_UNITS, "courtyard").map((unit) => unit.number),
    );
    assert.deepEqual(
      getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "ground").map((unit) => unit.number),
      getUnitsForRoomType(SAMPLE_ROOM_UNITS, "ground").map((unit) => unit.number),
    );
  });
});

describe("getTimelineDoorUnits", () => {
  it("lists every door once, ordered Twin/Superior → Deluxe → Family → Family GF", () => {
    const shortNames = new Map([
      ["courtyard", "Superior"],
      ["garden", "Deluxe"],
      ["loft", "Family"],
      ["ground", "Family GF"],
    ]);
    const doors = getTimelineDoorUnits(SAMPLE_ROOM_UNITS, shortNames).map(
      (unit) => unit.number,
    );
    assert.deepEqual(doors, ["113", "115", "118", "120", "112", "117", "119", "114", "116"]);
  });

  it("orders Twin → Double → Deluxe → Family when those short names are used", () => {
    const units = [
      { id: "u1", number: "201", sortOrder: 1, roomIds: ["family"], icalExportToken: null },
      { id: "u2", number: "101", sortOrder: 2, roomIds: ["deluxe"], icalExportToken: null },
      { id: "u3", number: "50", sortOrder: 3, roomIds: ["twin"], icalExportToken: null },
      { id: "u4", number: "75", sortOrder: 4, roomIds: ["double"], icalExportToken: null },
    ];
    const shortNames = new Map([
      ["twin", "Twin"],
      ["double", "Double"],
      ["deluxe", "Deluxe"],
      ["family", "Family"],
    ]);
    assert.deepEqual(
      getTimelineDoorUnits(units, shortNames).map((unit) => unit.number),
      ["50", "75", "101", "201"],
    );
  });

  it("uses the first linked room type for day-panel links", () => {
    const unit114 = SAMPLE_ROOM_UNITS.find((unit) => unit.number === "114");
    assert.ok(unit114);
    assert.equal(getPrimaryRoomIdForUnit(unit114), "loft");
  });
});

describe("applyDefaultRoomIds", () => {
  it("restores Family on door 114 when the DB still only links Deluxe", () => {
    const [unit114] = applyDefaultRoomIds([
      {
        id: "unit-114",
        number: "114",
        sortOrder: 50,
        roomIds: ["garden"],
        icalExportToken: null,
      },
    ]);

    assert.deepEqual(unit114.roomIds, ["loft"]);
    assert.deepEqual(
      getUnitsForRoomType([unit114], "loft").map((unit) => unit.number),
      ["114"],
    );
    assert.deepEqual(getTypeUnitIdSet([unit114], "loft"), new Set(["unit-114"]));
  });
});

describe("hasAssignableUnitForStay", () => {
  it("blocks Family when door 114 is taken by any stay on that door", () => {
    const units = SAMPLE_ROOM_UNITS;
    const unit114 = units.find((unit) => unit.number === "114");
    assert.ok(unit114);

    const occupancies = [
      occupancyFromBooking({
        databaseId: "other-type",
        roomUnitId: unit114.id,
        arrivalDate: "2026-08-10",
        departureDate: "2026-08-12",
        guest: "Deluxe guest",
      }),
    ];

    assert.equal(
      hasAssignableUnitForStay({
        units,
        roomId: "loft",
        arrivalDate: "2026-08-10",
        departureDate: "2026-08-11",
        occupancies,
      }),
      false,
    );
  });
});
