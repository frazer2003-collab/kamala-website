import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRoomTypeChange } from "./room-type-change";

const rooms = [
  { id: "courtyard", name: "Superior" },
  { id: "garden", name: "Deluxe" },
];

describe("resolveRoomTypeChange", () => {
  it("rejects unknown room ids", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "nope",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, { ok: false, error: "unknown-room" });
  });

  it("passes through orphaned current room id unchanged", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "legacy-room",
      requestedRoomId: "legacy-room",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, {
      ok: true,
      roomId: "legacy-room",
      roomName: "legacy-room",
      roomIdChanged: false,
      roomUnitId: "unit-1",
    });
  });

  it("keeps unit when type is unchanged", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "courtyard",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, {
      ok: true,
      roomId: "courtyard",
      roomName: "Superior",
      roomIdChanged: false,
      roomUnitId: "unit-1",
    });
  });

  it("clears unit when type changes even if form sends a unit", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "garden",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, {
      ok: true,
      roomId: "garden",
      roomName: "Deluxe",
      roomIdChanged: true,
      roomUnitId: null,
    });
  });

  it("treats empty requested id as current room", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "garden",
      requestedRoomId: "",
      rooms,
      formRoomUnitId: null,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.roomId, "garden");
      assert.equal(result.roomIdChanged, false);
    }
  });
});
