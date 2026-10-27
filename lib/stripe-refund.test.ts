import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStripeChargeAlreadyRefunded } from "./stripe-refund";

describe("stripe refund errors", () => {
  it("treats an already-refunded charge as done", () => {
    assert.equal(
      isStripeChargeAlreadyRefunded({ code: "charge_already_refunded" }),
      true,
    );
    assert.equal(
      isStripeChargeAlreadyRefunded({
        message: "Charge ch_123 has already been refunded.",
      }),
      true,
    );
  });

  it("leaves other Stripe failures as failures", () => {
    assert.equal(
      isStripeChargeAlreadyRefunded({ code: "resource_missing" }),
      false,
    );
    assert.equal(isStripeChargeAlreadyRefunded(null), false);
  });
});
