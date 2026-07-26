import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canDropStayOnUnit,
  parseTapeMovePayload,
  serializeTapeMovePayload,
} from "./staff-calendar-tape-move";
import type { RoomUnit, UnitOccupancy } from "./room-units";

const units: RoomUnit[] = [
  {
    id: "u-112",
    number: "112",
    sortOrder: 10,
    roomIds: ["garden"],
    icalExportToken: null,
  },
  {
    id: "u-114",
    number: "114",
    sortOrder: 20,
    roomIds: ["garden", "loft"],
    icalExportToken: null,
  },
  {
    id: "u-113",
    number: "113",
    sortOrder: 30,
    roomIds: ["courtyard"],
    icalExportToken: null,
  },
];

const payload = {
  kind: "booking" as const,
  stayId: "stay-1",
  roomId: "garden",
  arrivalDate: "2026-08-01",
  departureDate: "2026-08-03",
  guestLabel: "Mai",
  currentUnitId: "u-112",
};

describe("staff calendar tape move", () => {
  it("round-trips drag payload JSON", () => {
    const raw = serializeTapeMovePayload(payload);
    assert.deepEqual(parseTapeMovePayload(raw), payload);
    assert.equal(parseTapeMovePayload("not-json"), null);
  });

  it("allows drop on a free eligible door and blocks taken or wrong type", () => {
    const occupancies: UnitOccupancy[] = [
      {
        databaseId: "other",
        roomUnitId: "u-114",
        arrivalDate: "2026-08-01",
        departureDate: "2026-08-04",
        guest: "Taken",
      },
    ];

    assert.equal(
      canDropStayOnUnit({
        payload: { ...payload, currentUnitId: null },
        unit: units[0],
        units,
        occupancies,
      }).ok,
      true,
    );
    assert.equal(
      canDropStayOnUnit({
        payload,
        unit: units[0],
        units,
        occupancies,
      }).reason,
      "same-door",
    );
    assert.equal(
      canDropStayOnUnit({
        payload,
        unit: units[1],
        units,
        occupancies,
      }).reason,
      "taken",
    );
    assert.equal(
      canDropStayOnUnit({
        payload,
        unit: units[2],
        units,
        occupancies,
      }).reason,
      "wrong-type",
    );
  });
});
