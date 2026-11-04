import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCalendarDoorDropReplaceable,
  resolveCalendarDoorDrop,
} from "./calendar-door-drop";
import type { RoomUnit, UnitOccupancy } from "./room-units";

const units: RoomUnit[] = [
  { id: "u113", number: "113", sortOrder: 1, roomIds: ["courtyard"] },
  { id: "u115", number: "115", sortOrder: 2, roomIds: ["courtyard"] },
  { id: "u112", number: "112", sortOrder: 3, roomIds: ["garden"] },
];

const stayA = {
  id: "a",
  roomId: "courtyard",
  roomUnitId: "u113",
  arrivalDate: "2026-11-10",
  departureDate: "2026-11-13",
};

const stayB = {
  id: "b",
  roomId: "courtyard",
  roomUnitId: "u115",
  arrivalDate: "2026-11-11",
  departureDate: "2026-11-14",
};

const occupancies: UnitOccupancy[] = [
  {
    databaseId: "a",
    roomUnitId: "u113",
    arrivalDate: stayA.arrivalDate,
    departureDate: stayA.departureDate,
    guest: "A",
  },
  {
    databaseId: "b",
    roomUnitId: "u115",
    arrivalDate: stayB.arrivalDate,
    departureDate: stayB.departureDate,
    guest: "B",
  },
];

describe("calendar door drop", () => {
  it("assigns onto an empty eligible door", () => {
    const plan = resolveCalendarDoorDrop({
      source: { ...stayA, roomUnitId: null },
      target: { type: "unit", unitId: "u113" },
      units,
      occupancies: occupancies.filter((row) => row.databaseId !== "a"),
    });
    assert.deepEqual(plan, {
      action: "assign",
      bookingId: "a",
      unitId: "u113",
    });
  });

  it("swaps when both courtyard doors are mutually free", () => {
    const plan = resolveCalendarDoorDrop({
      source: stayA,
      target: { type: "booking", stay: stayB },
      units,
      occupancies,
    });
    assert.deepEqual(plan, {
      action: "swap",
      sourceId: "a",
      sourceUnitId: "u113",
      targetId: "b",
      targetUnitId: "u115",
    });
    assert.equal(
      isCalendarDoorDropReplaceable({
        source: stayA,
        target: stayB,
        units,
        occupancies,
      }),
      true,
    );
  });

  it("replaces when only the source can take the target door", () => {
    const gardenStay = {
      id: "g",
      roomId: "garden",
      roomUnitId: "u112",
      arrivalDate: "2026-11-10",
      departureDate: "2026-11-12",
    };
    const rows: UnitOccupancy[] = [
      ...occupancies,
      {
        databaseId: "g",
        roomUnitId: "u112",
        arrivalDate: gardenStay.arrivalDate,
        departureDate: gardenStay.departureDate,
        guest: "G",
      },
    ];
    // Courtyard stay onto garden door — ineligible.
    assert.equal(
      resolveCalendarDoorDrop({
        source: stayA,
        target: { type: "booking", stay: gardenStay },
        units,
        occupancies: rows,
      }).action,
      "reject",
    );

    // Unassigned courtyard stay onto B's door while A keeps 113 — replace B.
    const unassigned = { ...stayA, id: "c", roomUnitId: null as string | null };
    const plan = resolveCalendarDoorDrop({
      source: unassigned,
      target: { type: "booking", stay: stayB },
      units,
      occupancies: [
        ...occupancies,
        {
          databaseId: "c",
          roomUnitId: null,
          arrivalDate: unassigned.arrivalDate,
          departureDate: unassigned.departureDate,
          guest: "C",
        },
      ],
    });
    assert.deepEqual(plan, {
      action: "replace",
      sourceId: "c",
      unitId: "u115",
      displacedId: "b",
    });
  });

  it("rejects wrong room type on empty door", () => {
    const plan = resolveCalendarDoorDrop({
      source: stayA,
      target: { type: "unit", unitId: "u112" },
      units,
      occupancies,
    });
    assert.deepEqual(plan, { action: "reject", reason: "ineligible" });
  });

  it("unassigns a door stay onto No #", () => {
    assert.deepEqual(
      resolveCalendarDoorDrop({
        source: stayA,
        target: { type: "unassign" },
        units,
        occupancies,
      }),
      { action: "unassign", bookingId: "a" },
    );
  });
});
