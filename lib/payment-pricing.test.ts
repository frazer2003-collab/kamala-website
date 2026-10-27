import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateStripeChargeAmount,
  cardRefundKeepingCharge,
  resolveBookingStayTotal,
  STRIPE_BANK_CHARGE_RATE,
} from "./payment-pricing";

describe("calculateStripeChargeAmount", () => {
  it("adds 6% bank charge and keeps integers", () => {
    assert.equal(STRIPE_BANK_CHARGE_RATE, 0.06);
    const result = calculateStripeChargeAmount(1000);
    assert.deepEqual(result, { stayTotal: 1000, surcharge: 60, totalDue: 1060 });
  });

  it("rounds to nearest major unit", () => {
    const result = calculateStripeChargeAmount(999);
    assert.equal(result.totalDue, Math.round(999 * 1.06));
    assert.equal(result.surcharge, result.totalDue - 999);
  });

  it("never returns total below 1", () => {
    assert.equal(calculateStripeChargeAmount(0).totalDue, 1);
  });
});

describe("cardRefundKeepingCharge", () => {
  it("refunds the stay and keeps the 6% bank charge", () => {
    const charge = calculateStripeChargeAmount(2380);
    const result = cardRefundKeepingCharge({
      amountReceivedMinor: charge.totalDue * 100,
      alreadyRefundedMinor: 0,
      stayTotalMajor: 2380,
    });
    assert.deepEqual(result, {
      action: "refund",
      amountMinor: 2380 * 100,
      keptChargeMinor: charge.surcharge * 100,
    });
  });

  it("refunds the whole payment when no bank charge was collected", () => {
    assert.deepEqual(
      cardRefundKeepingCharge({
        amountReceivedMinor: 238000,
        alreadyRefundedMinor: 0,
        stayTotalMajor: 2380,
      }),
      { action: "refund", amountMinor: 238000, keptChargeMinor: 0 },
    );
  });

  it("does not refund the bank charge after the stay is already back", () => {
    const charge = calculateStripeChargeAmount(1000);
    assert.deepEqual(
      cardRefundKeepingCharge({
        amountReceivedMinor: charge.totalDue * 100,
        alreadyRefundedMinor: 1000 * 100,
        stayTotalMajor: 1000,
      }),
      { action: "done", keptChargeMinor: charge.surcharge * 100 },
    );
  });

  it("refunds the bank charge too when staff waive it", () => {
    const charge = calculateStripeChargeAmount(2380);
    assert.deepEqual(
      cardRefundKeepingCharge({
        amountReceivedMinor: charge.totalDue * 100,
        alreadyRefundedMinor: 0,
        stayTotalMajor: 2380,
        keepBankCharge: false,
      }),
      {
        action: "refund",
        amountMinor: charge.totalDue * 100,
        keptChargeMinor: 0,
      },
    );
  });

  it("returns a bank charge that was kept on an earlier refund", () => {
    const charge = calculateStripeChargeAmount(1000);
    assert.deepEqual(
      cardRefundKeepingCharge({
        amountReceivedMinor: charge.totalDue * 100,
        alreadyRefundedMinor: 1000 * 100,
        stayTotalMajor: 1000,
        keepBankCharge: false,
      }),
      {
        action: "refund",
        amountMinor: charge.surcharge * 100,
        keptChargeMinor: 0,
      },
    );
  });

  it("refunds only the rest of the stay after a partial refund", () => {
    const charge = calculateStripeChargeAmount(1000);
    assert.deepEqual(
      cardRefundKeepingCharge({
        amountReceivedMinor: charge.totalDue * 100,
        alreadyRefundedMinor: 400 * 100,
        stayTotalMajor: 1000,
      }),
      {
        action: "refund",
        amountMinor: 600 * 100,
        keptChargeMinor: charge.surcharge * 100,
      },
    );
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
