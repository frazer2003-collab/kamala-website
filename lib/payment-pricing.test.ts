import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateStripeChargeAmount,
  resolveBookingStayTotal,
  STRIPE_BANK_CHARGE_RATE,
} from "./payment-pricing";

describe("calculateStripeChargeAmount", () => {
  it("adds 3% bank charge and keeps integers", () => {
    assert.equal(STRIPE_BANK_CHARGE_RATE, 0.03);
    const result = calculateStripeChargeAmount(1000);
    assert.deepEqual(result, { stayTotal: 1000, surcharge: 30, totalDue: 1030 });
  });

  it("rounds to nearest major unit", () => {
    const result = calculateStripeChargeAmount(999);
    assert.equal(result.totalDue, Math.round(999 * 1.03));
    assert.equal(result.surcharge, result.totalDue - 999);
  });

  it("never returns total below 1", () => {
    assert.equal(calculateStripeChargeAmount(0).totalDue, 1);
  });
});

describe("resolveBookingStayTotal", () => {
  it("uses the persisted deposit amount instead of a client quote", () => {
    assert.equal(
      resolveBookingStayTotal({ depositAmount: 4200, estimatedTotal: 3900 }),
      4200,
    );
  });

  it("falls back to the persisted estimate for older bookings", () => {
    assert.equal(
      resolveBookingStayTotal({ depositAmount: null, estimatedTotal: 3900 }),
      3900,
    );
  });
});
