import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BED_SETUP_REQUIRED_ERROR,
  defaultBedSetupForRoom,
  formatBedSetup,
  formatBedSetupCode,
  formatCalendarGuestLabel,
  splitCalendarGuestLabel,
  getAllowedBedSetups,
  parseBedSetup,
  resolveBedSetupForRoom,
  resolveStaffBedSetup,
  roomOffersBedSetupChoice,
} from "./bed-setup";

describe("bed setup by room", () => {
  it("prefixes TWN/DBL on calendar guest labels", () => {
    assert.equal(formatCalendarGuestLabel("Ana", "twin"), "TWN Ana");
    assert.equal(formatCalendarGuestLabel("Ana", "double"), "DBL Ana");
    assert.equal(formatCalendarGuestLabel("Ana", null), "Ana");
    assert.equal(formatCalendarGuestLabel("  ", "twin"), "TWN Guest");
    assert.deepEqual(splitCalendarGuestLabel("TWN Somchai"), {
      bedCode: "TWN",
      guestName: "Somchai",
    });
    assert.deepEqual(splitCalendarGuestLabel("Walk-in guest"), {
      bedCode: null,
      guestName: "Walk-in guest",
    });
  });

  it("offers king or twin only on Superior (courtyard), with no silent default", () => {
    assert.deepEqual(getAllowedBedSetups("courtyard"), ["double", "twin"]);
    assert.equal(roomOffersBedSetupChoice("courtyard"), true);
    assert.equal(defaultBedSetupForRoom("courtyard"), "");

    for (const roomId of ["garden", "loft", "ground"]) {
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

  it("parses desk codes TWN and DBL", () => {
    assert.equal(parseBedSetup("TWN"), "twin");
    assert.equal(parseBedSetup("twn"), "twin");
    assert.equal(parseBedSetup("DBL"), "double");
    assert.equal(parseBedSetup("king"), "double");
    assert.equal(formatBedSetupCode("twin"), "TWN");
    assert.equal(formatBedSetupCode("double"), "DBL");
  });

  it("requires a bed code for staff-created stays on any room", () => {
    assert.deepEqual(resolveStaffBedSetup("TWN"), {
      bedSetup: "twin",
      error: null,
    });
    assert.deepEqual(resolveStaffBedSetup("DBL"), {
      bedSetup: "double",
      error: null,
    });
    assert.deepEqual(resolveStaffBedSetup(""), {
      bedSetup: null,
      error: BED_SETUP_REQUIRED_ERROR,
    });
  });
});
