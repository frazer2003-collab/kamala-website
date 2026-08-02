import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_ROOM_UNITS,
  getKnownUnitIdSet,
  stayNeedsRoomAssignment,
} from "./room-units";

describe("stayNeedsRoomAssignment", () => {
  const known = getKnownUnitIdSet(SAMPLE_ROOM_UNITS);

  it("treats null unit as needing a room", () => {
    assert.equal(stayNeedsRoomAssignment({ roomUnitId: null }, known), true);
  });

  it("treats orphaned unit ids as needing a room", () => {
    assert.equal(
      stayNeedsRoomAssignment({ roomUnitId: "deleted-unit" }, known),
      true,
    );
  });

  it("accepts a known door id", () => {
    const unit116 = SAMPLE_ROOM_UNITS.find((unit) => unit.number === "116");
    assert.ok(unit116);
    assert.equal(
      stayNeedsRoomAssignment({ roomUnitId: unit116.id }, known),
      false,
    );
  });
});
