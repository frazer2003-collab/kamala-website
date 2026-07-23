import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultBedSetupForRoom,
  formatBedSetup,
  getAllowedBedSetups,
  resolveBedSetupForRoom,
  roomOffersBedSetupChoice,
} from "./bed-setup";

describe("bed setup by room", () => {
  it("offers double or twin for every room", () => {
    for (const roomId of ["courtyard", "garden", "veranda", "loft", "ground"]) {
      assert.deepEqual(getAllowedBedSetups(roomId), ["double", "twin"]);
      assert.equal(roomOffersBedSetupChoice(roomId), true);
      assert.equal(defaultBedSetupForRoom(roomId), "double");
    }
  });

  it("requires a valid double or twin choice", () => {
    assert.deepEqual(resolveBedSetupForRoom("garden", "twin"), {
      bedSetup: "twin",
      error: null,
    });
    assert.equal(resolveBedSetupForRoom("loft", "queen").error !== null, true);
    assert.equal(resolveBedSetupForRoom("courtyard", "").error !== null, true);
  });

  it("formats bed setup in plain language", () => {
    assert.equal(formatBedSetup("double"), "One double bed");
    assert.equal(formatBedSetup("twin"), "Two single beds");
  });
});
