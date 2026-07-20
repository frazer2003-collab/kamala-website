import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canCleanupPendingBooking,
  getBankClaimCardError,
} from "./booking-payment-race";

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

describe("getBankClaimCardError", () => {
  it("prevents a bank claim when card payment has won or is processing", () => {
    assert.equal(getBankClaimCardError("succeeded"), "card_already_paid");
    assert.equal(getBankClaimCardError("processing"), "card_processing");
  });

  it("allows a bank claim for cancelable or failed card intents", () => {
    assert.equal(getBankClaimCardError("requires_payment_method"), null);
    assert.equal(getBankClaimCardError("requires_confirmation"), null);
    assert.equal(getBankClaimCardError("canceled"), null);
  });
});
