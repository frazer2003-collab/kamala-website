import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingReservesRoom } from "./booking-reservation";

describe("bookingReservesRoom", () => {
  it("reserves inventory for a bank transfer claim", () => {
    assert.equal(
      bookingReservesRoom({
        status: "pending",
        deposit_paid_at: null,
        bank_transfer_claimed_at: "2026-07-18T07:00:00.000Z",
      }),
      true,
    );
  });

  it("does not reserve inventory for a declined booking", () => {
    assert.equal(
      bookingReservesRoom({
        status: "declined",
        deposit_paid_at: "2026-07-18T07:00:00.000Z",
        bank_transfer_claimed_at: "2026-07-18T07:00:00.000Z",
      }),
      false,
    );
  });
});
