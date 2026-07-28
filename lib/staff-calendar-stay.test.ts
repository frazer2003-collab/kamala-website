import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStaffCalendarManageableStay,
  nextStatusAfterGuestMessage,
  nextStatusAfterStaffReply,
} from "./staff-calendar-stay";

describe("isStaffCalendarManageableStay", () => {
  it("allows confirmed stays", () => {
    assert.equal(isStaffCalendarManageableStay({ status: "confirmed" }), true);
  });

  it("allows paid awaiting and needs-reply", () => {
    assert.equal(
      isStaffCalendarManageableStay({
        status: "awaiting",
        depositPaid: true,
      }),
      true,
    );
    assert.equal(
      isStaffCalendarManageableStay({
        status: "needs-reply",
        deposit_paid_at: "2026-07-01T00:00:00.000Z",
      }),
      true,
    );
  });

  it("blocks unpaid awaiting and new requests", () => {
    assert.equal(
      isStaffCalendarManageableStay({ status: "awaiting", depositPaid: false }),
      false,
    );
    assert.equal(isStaffCalendarManageableStay({ status: "new" }), false);
    assert.equal(
      isStaffCalendarManageableStay({ status: "pending_payment" }),
      false,
    );
  });
});

describe("conversation status transitions", () => {
  it("flags awaiting and confirmed when the guest writes", () => {
    assert.equal(nextStatusAfterGuestMessage("awaiting"), "needs-reply");
    assert.equal(nextStatusAfterGuestMessage("confirmed"), "needs-reply");
    assert.equal(nextStatusAfterGuestMessage("needs-reply"), null);
    assert.equal(nextStatusAfterGuestMessage("declined"), null);
  });

  it("restores confirmed after staff reply when deposit is paid", () => {
    assert.equal(nextStatusAfterStaffReply("needs-reply", true), "confirmed");
    assert.equal(nextStatusAfterStaffReply("needs-reply", false), "awaiting");
    assert.equal(nextStatusAfterStaffReply("confirmed", true), null);
  });
});
