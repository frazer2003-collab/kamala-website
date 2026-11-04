import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { staffBankRefundWaitingCopy } from "./refund-notice";

describe("staffBankRefundWaitingCopy", () => {
  it("tells staff a Thai bank refund is waiting on Transfers", () => {
    const copy = staffBankRefundWaitingCopy("Nok", "2,380 THB", "cancelled");
    assert.equal(copy.subject, "Thai bank refund waiting: Nok");
    assert.match(copy.intro, /2,380 THB/);
    assert.match(copy.intro, /waiting to be started in Transfers/i);
    assert.match(copy.next, /Start Thai bank \/ QR refund/i);
  });
});
