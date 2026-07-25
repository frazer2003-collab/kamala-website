import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_BAR_PALETTE,
  assignGuestBarColors,
  guestBarColorForName,
  normalizeGuestColorKey,
} from "./booking-bar-colors";

describe("assignGuestBarColors", () => {
  it("gives the same color to the same guest name ignoring case and spacing", () => {
    const colors = assignGuestBarColors(["Ada Lovelace", "ada  lovelace", "Grace"]);

    assert.equal(
      guestBarColorForName("ADA LOVELACE", colors),
      guestBarColorForName("ada lovelace", colors),
    );
    assert.notEqual(
      guestBarColorForName("Ada Lovelace", colors),
      guestBarColorForName("Grace", colors),
    );
  });

  it("does not reuse a palette color until every slot is taken", () => {
    const names = BOOKING_BAR_PALETTE.map((_, index) => `Guest ${index + 1}`);
    const colors = assignGuestBarColors(names);
    const assigned = names.map((name) => guestBarColorForName(name, colors));

    assert.equal(new Set(assigned).size, BOOKING_BAR_PALETTE.length);
  });

  it("is stable for the same set of names", () => {
    const first = assignGuestBarColors(["Zoe", "Amy", "Ben"]);
    const second = assignGuestBarColors(["Ben", "Zoe", "Amy"]);

    assert.equal(guestBarColorForName("Amy", first), guestBarColorForName("Amy", second));
    assert.equal(guestBarColorForName("Zoe", first), guestBarColorForName("Zoe", second));
  });

  it("keeps a guest color when another guest is added later", () => {
    const alone = assignGuestBarColors(["Zoe"]);
    const withFriend = assignGuestBarColors(["Zoe", "Amy"]);

    assert.equal(guestBarColorForName("Zoe", alone), guestBarColorForName("Zoe", withFriend));
  });
});

describe("normalizeGuestColorKey", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(normalizeGuestColorKey("  Ann   Marie "), "ann marie");
  });
});
