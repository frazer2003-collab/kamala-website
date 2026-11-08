import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addToPaymentRail,
  emptyPaymentRailTotals,
  formatPaymentCollectedVia,
  formatStaffPaidLabel,
  parsePaymentCollectedVia,
  resolveStayPaymentRail,
} from "./payment-collected";

describe("payment collected via", () => {
  it("parses cash, thai bank, and stripe", () => {
    assert.equal(parsePaymentCollectedVia("cash"), "cash");
    assert.equal(parsePaymentCollectedVia("thai_bank"), "thai_bank");
    assert.equal(parsePaymentCollectedVia("stripe"), "stripe");
    assert.equal(parsePaymentCollectedVia("card"), null);
    assert.equal(parsePaymentCollectedVia(""), null);
  });

  it("resolves stay payment rails", () => {
    assert.equal(
      resolveStayPaymentRail({
        depositPaid: true,
        paymentCollectedVia: "cash",
        stripePaymentIntentId: "pi_x",
      }),
      "cash",
    );
    assert.equal(
      resolveStayPaymentRail({
        depositPaid: true,
        paymentCollectedVia: null,
        stripePaymentIntentId: "pi_x",
      }),
      "stripe",
    );
    assert.equal(
      resolveStayPaymentRail({
        depositPaid: true,
        paymentCollectedVia: null,
        paidViaOta: true,
      }),
      "stripe",
    );
    assert.equal(
      resolveStayPaymentRail({
        depositPaid: true,
        paymentCollectedVia: null,
      }),
      null,
    );
    assert.equal(resolveStayPaymentRail({ depositPaid: false }), null);
  });

  it("accumulates rail totals", () => {
    const totals = emptyPaymentRailTotals();
    addToPaymentRail(totals, "cash", 100);
    addToPaymentRail(totals, "thai_bank", 50);
    addToPaymentRail(totals, null, 25);
    assert.equal(totals.cash, 100);
    assert.equal(totals.thai_bank, 50);
    assert.equal(totals.stripe, 0);
    assert.equal(totals.untagged, 25);
  });

  it("labels paid stays for staff", () => {
    assert.equal(formatPaymentCollectedVia("cash"), "Cash");
    assert.equal(formatPaymentCollectedVia("stripe"), "Stripe");
    assert.equal(
      formatStaffPaidLabel({
        depositPaid: true,
        paidByCard: true,
        paymentCollectedVia: null,
      }),
      "Paid · Card",
    );
    assert.equal(
      formatStaffPaidLabel({
        depositPaid: true,
        paidByCard: false,
        paymentCollectedVia: "thai_bank",
      }),
      "Paid · Thai bank",
    );
    assert.equal(
      formatStaffPaidLabel({
        depositPaid: true,
        paidByCard: false,
        paymentCollectedVia: "cash",
      }),
      "Paid · Cash",
    );
    assert.equal(
      formatStaffPaidLabel({
        depositPaid: true,
        paidByCard: false,
        paymentCollectedVia: "stripe",
      }),
      "Paid · Stripe",
    );
    assert.equal(
      formatStaffPaidLabel({ depositPaid: false, paidByCard: false }),
      "Unpaid",
    );
    assert.equal(
      formatStaffPaidLabel({
        depositPaid: true,
        paidByCard: false,
        paidViaOta: true,
        paymentCollectedVia: null,
      }),
      "Paid · Card",
    );
  });
});
