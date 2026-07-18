import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canCleanupPendingBooking } from "./booking-payment-race";

describe("canCleanupPendingBooking", () => {
  it("allows cleanup only for unclaimed pending-payment bookings", () => {
    assert.equal(
      canCleanupPendingBooking({
        status: "pending_payment",
        bankTransferClaimedAt: null,
      }),
      true,
    );
  });

  it("preserves bookings after a bank transfer claim", () => {
    assert.equal(
      canCleanupPendingBooking({
        status: "awaiting",
        bankTransferClaimedAt: "2026-07-18T08:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      canCleanupPendingBooking({
        status: "pending_payment",
        bankTransferClaimedAt: "2026-07-18T08:00:00.000Z",
      }),
      false,
    );
  });
});
