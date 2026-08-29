import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHomeBookingPathStep } from "./home-booking-path";

describe("resolveHomeBookingPathStep", () => {
  it("starts on dates when no stay is chosen", () => {
    assert.equal(resolveHomeBookingPathStep(false, false), "dates");
  });

  it("moves to room when dates are set", () => {
    assert.equal(resolveHomeBookingPathStep(true, false), "room");
  });

  it("moves to reserve when a room is selected", () => {
    assert.equal(resolveHomeBookingPathStep(true, true), "reserve");
  });
});
