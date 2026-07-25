import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_ROOM_UNITS,
  getTimelineUnitsForRoomType,
  getUnitsForRoomType,
} from "@/lib/room-units";

describe("getTimelineUnitsForRoomType", () => {
  it("keeps shared doors assignable under every linked type", () => {
    const garden = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map((unit) => unit.number);
    const veranda = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "veranda").map((unit) => unit.number);
    const loft = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map((unit) => unit.number);

    assert.deepEqual(garden, ["112", "114", "117", "119"]);
    assert.deepEqual(veranda, ["112"]);
    assert.deepEqual(loft, ["114"]);
  });

  it("hides Deluxe 114 and Triple 112 on the timeline only", () => {
    const garden = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map(
      (unit) => unit.number,
    );
    const veranda = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "veranda").map(
      (unit) => unit.number,
    );
    const loft = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map(
      (unit) => unit.number,
    );

    assert.deepEqual(garden, ["112", "117", "119"]);
    assert.deepEqual(veranda, []);
    assert.deepEqual(loft, ["114"]);
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
