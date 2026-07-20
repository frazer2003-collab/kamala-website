import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingBlocksCalendarExport,
  bookingReservesRoom,
} from "./booking-reservation";

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

  it("reserves inventory while card payment is pending", () => {
    assert.equal(
      bookingReservesRoom({
        status: "pending_payment",
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
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

describe("bookingBlocksCalendarExport", () => {
  it("blocks export for open unconfirmed requests", () => {
    assert.equal(bookingBlocksCalendarExport({ status: "new" }), true);
    assert.equal(bookingBlocksCalendarExport({ status: "pending_payment" }), true);
    assert.equal(bookingBlocksCalendarExport({ status: "awaiting" }), true);
  });

  it("does not block export for declined requests", () => {
    assert.equal(bookingBlocksCalendarExport({ status: "declined" }), false);
  });
});
