import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABANDONED_CHECKOUT_MAX_AGE_MS,
  abandonedCheckoutCutoffIso,
  isExpiredAbandonedCheckout,
} from "./abandoned-checkout";

describe("abandonedCheckoutCutoffIso", () => {
  it("is 24 hours before now", () => {
    const now = new Date("2026-11-03T12:00:00.000Z");
    assert.equal(
      abandonedCheckoutCutoffIso(now),
      new Date(now.getTime() - ABANDONED_CHECKOUT_MAX_AGE_MS).toISOString(),
    );
  });
});

describe("isExpiredAbandonedCheckout", () => {
  const now = new Date("2026-11-03T12:00:00.000Z");

  it("expires unfinished bank / QR carts after 24 hours", () => {
    assert.equal(
      isExpiredAbandonedCheckout({
        status: "pending_payment",
        bankTransferClaimedAt: null,
        depositPaidAt: null,
        createdAt: "2026-11-02T11:59:00.000Z",
        now,
      }),
      true,
    );
  });

  it("keeps carts under 24 hours", () => {
    assert.equal(
      isExpiredAbandonedCheckout({
        status: "pending_payment",
        bankTransferClaimedAt: null,
        depositPaidAt: null,
        createdAt: "2026-11-02T12:01:00.000Z",
        now,
      }),
      false,
    );
  });

  it("never expires I've-paid claims waiting for staff", () => {
    assert.equal(
      isExpiredAbandonedCheckout({
        status: "awaiting",
        bankTransferClaimedAt: "2026-11-01T08:00:00.000Z",
        depositPaidAt: null,
        createdAt: "2026-11-01T07:00:00.000Z",
        now,
      }),
      false,
    );
  });
});
