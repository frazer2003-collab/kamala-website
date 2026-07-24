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
  it("offers double or twin only on Superior (courtyard)", () => {
    assert.deepEqual(getAllowedBedSetups("courtyard"), ["double", "twin"]);
    assert.equal(roomOffersBedSetupChoice("courtyard"), true);
    assert.equal(defaultBedSetupForRoom("courtyard"), "double");

    for (const roomId of ["garden", "veranda", "loft", "ground"]) {
      assert.deepEqual(getAllowedBedSetups(roomId), []);
      assert.equal(roomOffersBedSetupChoice(roomId), false);
      assert.equal(defaultBedSetupForRoom(roomId), "");
    }
  });

  it("requires a valid double or twin choice on Superior only", () => {
    assert.deepEqual(resolveBedSetupForRoom("courtyard", "twin"), {
      bedSetup: "twin",
      error: null,
    });
    assert.equal(resolveBedSetupForRoom("courtyard", "queen").error !== null, true);
    assert.equal(resolveBedSetupForRoom("courtyard", "").error !== null, true);

    assert.deepEqual(resolveBedSetupForRoom("garden", "twin"), {
      bedSetup: null,
      error: null,
    });
    assert.deepEqual(resolveBedSetupForRoom("loft", ""), {
      bedSetup: null,
      error: null,
    });
  });

  it("formats bed setup in plain language", () => {
    assert.equal(formatBedSetup("double"), "One double bed");
    assert.equal(formatBedSetup("twin"), "Two single beds");
  });
});
