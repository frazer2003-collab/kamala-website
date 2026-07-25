import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_ROOM_UNITS,
  getTimelineUnitsForRoomType,
  getUnitsForRoomType,
} from "@/lib/room-units";

describe("getTimelineUnitsForRoomType", () => {
  it("keeps door 114 assignable under Deluxe and Family", () => {
    const garden = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map((unit) => unit.number);
    const loft = getUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map((unit) => unit.number);

    assert.deepEqual(garden, ["112", "114", "117", "119"]);
    assert.deepEqual(loft, ["114"]);
  });

  it("hides Deluxe 114 on the timeline so Family owns that row", () => {
    const garden = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "garden").map(
      (unit) => unit.number,
    );
    const loft = getTimelineUnitsForRoomType(SAMPLE_ROOM_UNITS, "loft").map(
      (unit) => unit.number,
    );

    assert.deepEqual(garden, ["112", "117", "119"]);
    assert.deepEqual(loft, ["114"]);
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
