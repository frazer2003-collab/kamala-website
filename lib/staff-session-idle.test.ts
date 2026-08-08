import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STAFF_IDLE_TIMEOUT_MS,
  STAFF_IDLE_WARNING_MS,
  formatStaffIdleCountdown,
  staffIdleMsRemaining,
  staffIdlePhase,
} from "./staff-session-idle";

describe("staff session idle", () => {
  const start = 1_000_000;

  it("stays active before the warning window", () => {
    assert.equal(staffIdlePhase(start, start), "active");
    assert.equal(
      staffIdlePhase(start + STAFF_IDLE_TIMEOUT_MS - STAFF_IDLE_WARNING_MS - 1, start),
      "active",
    );
  });

  it("warns in the final window before expiry", () => {
    assert.equal(
      staffIdlePhase(start + STAFF_IDLE_TIMEOUT_MS - STAFF_IDLE_WARNING_MS, start),
      "warning",
    );
    assert.equal(
      staffIdlePhase(start + STAFF_IDLE_TIMEOUT_MS - 1, start),
      "warning",
    );
  });

  it("expires at the idle timeout", () => {
    assert.equal(
      staffIdlePhase(start + STAFF_IDLE_TIMEOUT_MS, start),
      "expired",
    );
  });

  it("formats a short countdown for the warning dialog", () => {
    assert.equal(formatStaffIdleCountdown(125_000), "2:05");
    assert.equal(formatStaffIdleCountdown(0), "0:00");
    assert.equal(staffIdleMsRemaining(start + 10_000, start), STAFF_IDLE_TIMEOUT_MS - 10_000);
  });
});
