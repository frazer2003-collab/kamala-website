import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bangkokPickupMs,
  isTourPickupOnHomeBoard,
  parsePickupTime,
  stayNeedsDeepClean,
} from "./staff-home-board";

describe("tour pickup home window", () => {
  it("parses HH:MM pickup times", () => {
    assert.equal(parsePickupTime("9:05"), "09:05");
    assert.equal(parsePickupTime("14:30:00"), "14:30");
    assert.equal(parsePickupTime("nope"), null);
  });

  it("shows from 24h before pickup until 6h after", () => {
    const pickupMs = bangkokPickupMs("2026-11-10", "10:00");
    assert.ok(pickupMs);

    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! - 23 * 60 * 60 * 1000,
      }),
      true,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! - 25 * 60 * 60 * 1000,
      }),
      false,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! + 5 * 60 * 60 * 1000,
      }),
      true,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! + 7 * 60 * 60 * 1000,
      }),
      false,
    );
  });
});

describe("deep clean due", () => {
  it("flags in-house stays after 3 nights since arrival or last clean", () => {
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: null,
        todayIso: "2026-11-11",
      }),
      true,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: null,
        todayIso: "2026-11-10",
      }),
      false,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: "2026-11-11",
        todayIso: "2026-11-13",
      }),
      false,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: "2026-11-11",
        todayIso: "2026-11-14",
      }),
      true,
    );
  });
});
