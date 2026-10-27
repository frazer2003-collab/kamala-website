import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CARD_REFUND_GUEST_TIMING,
  guestBankRefundSentMessage,
  staffBankRefundCopy,
  staffCardRefundCopy,
} from "./refund-notice";

describe("refund notices", () => {
  it("tells staff a card refund is already with Stripe and when it lands", () => {
    const copy = staffCardRefundCopy("Ada", "700 THB", "cheaper-stay");
    assert.match(copy.intro, /Stripe is refunding 700 THB/);
    assert.match(copy.intro, /do not send anything/);
    assert.equal(copy.next, CARD_REFUND_GUEST_TIMING);
    assert.match(copy.next, /5 to 10 business days/);
  });

  it("tells staff to refund in Stripe when the automatic refund fails", () => {
    const copy = staffCardRefundCopy("Ada", "700 THB", "top-up-voided", true);
    assert.match(copy.subject, /failed/);
    assert.match(copy.next, /Refund 700 THB in Stripe/);
    assert.match(copy.next, /5 to 10 business days/);
  });

  it("tells staff how to send a bank refund and when the guest sees it", () => {
    const copy = staffBankRefundCopy("Ada", "700 THB", "declined");
    assert.match(copy.intro, /guesthouse bank account/);
    assert.match(copy.next, /already closed/);
    assert.doesNotMatch(copy.next, /Mark refund sent/);
    assert.match(
      staffBankRefundCopy("Ada", "700 THB", "cheaper-stay").next,
      /Mark refund sent/,
    );
    assert.match(copy.next, /same day/);
  });

  it("uses the same timing when a calendar stay is cancelled", () => {
    const card = staffCardRefundCopy("Ada", "2,380 THB", "cancelled");
    assert.match(card.intro, /stay was cancelled/);
    assert.match(card.intro, /Stripe is refunding 2,380 THB/);
    assert.match(card.next, /5 to 10 business days/);
    assert.match(
      staffCardRefundCopy("Ada", "2,380 THB", "cancelled", false, "143 THB").intro,
      /143 THB bank charge stays with the guesthouse/,
    );

    const bank = staffBankRefundCopy("Ada", "2,380 THB", "cancelled");
    assert.match(bank.intro, /guesthouse bank account/);
    assert.match(bank.next, /already closed/);
    assert.match(bank.next, /same day/);
  });

  it("tells the guest when a sent bank refund should arrive", () => {
    assert.match(guestBankRefundSentMessage("700 THB"), /same day/);
  });
});
