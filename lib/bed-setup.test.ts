import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BED_SETUP_REQUIRED_ERROR,
  defaultBedSetupForRoom,
  formatBedSetup,
  getAllowedBedSetups,
  resolveBedSetupForRoom,
  roomOffersBedSetupChoice,
} from "./bed-setup";

describe("bed setup by room", () => {
  it("offers king or twin only on Superior (courtyard), with no silent default", () => {
    assert.deepEqual(getAllowedBedSetups("courtyard"), ["double", "twin"]);
    assert.equal(roomOffersBedSetupChoice("courtyard"), true);
    assert.equal(defaultBedSetupForRoom("courtyard"), "");

    for (const roomId of ["garden", "veranda", "loft", "ground"]) {
      assert.deepEqual(getAllowedBedSetups(roomId), []);
      assert.equal(roomOffersBedSetupChoice(roomId), false);
      assert.equal(defaultBedSetupForRoom(roomId), "");
    }
  });

  it("requires a valid king or twin choice on Superior only", () => {
    assert.deepEqual(resolveBedSetupForRoom("courtyard", "twin"), {
      bedSetup: "twin",
      error: null,
    });
    assert.deepEqual(resolveBedSetupForRoom("courtyard", "double"), {
      bedSetup: "double",
      error: null,
    });
    assert.deepEqual(resolveBedSetupForRoom("courtyard", "queen"), {
      bedSetup: null,
      error: BED_SETUP_REQUIRED_ERROR,
    });
    assert.deepEqual(resolveBedSetupForRoom("courtyard", ""), {
      bedSetup: null,
      error: BED_SETUP_REQUIRED_ERROR,
    });

    assert.deepEqual(resolveBedSetupForRoom("garden", "twin"), {
      bedSetup: null,
      error: null,
    });
    assert.deepEqual(resolveBedSetupForRoom("loft", ""), {
      bedSetup: null,
      error: null,
    });
  });

  it("formats bed setup in plain language matching room marketing", () => {
    assert.equal(formatBedSetup("double"), "King — one bed");
    assert.equal(formatBedSetup("twin"), "Twin — two single beds");
  });
});
