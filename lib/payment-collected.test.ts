import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPaymentCollectedVia,
  formatStaffPaidLabel,
  parsePaymentCollectedVia,
} from "./payment-collected";

describe("payment collected via", () => {
  it("parses cash, thai bank, and stripe", () => {
    assert.equal(parsePaymentCollectedVia("cash"), "cash");
    assert.equal(parsePaymentCollectedVia("thai_bank"), "thai_bank");
    assert.equal(parsePaymentCollectedVia("stripe"), "stripe");
    assert.equal(parsePaymentCollectedVia("card"), null);
    assert.equal(parsePaymentCollectedVia(""), null);
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
