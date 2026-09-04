import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingBlocksCalendarExport,
  bookingReservesRoom,
} from "./booking-reservation";

describe("bookingReservesRoom", () => {
  it("reserves inventory for confirmed staff-keyed stays even when unpaid", () => {
    assert.equal(
      bookingReservesRoom({
        status: "confirmed",
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
      }),
      true,
    );
  });

  it("does not reserve inventory for a Thai QR claim waiting in Requests", () => {
    assert.equal(
      bookingReservesRoom({
        status: "awaiting",
        deposit_paid_at: null,
        bank_transfer_claimed_at: "2026-07-18T07:00:00.000Z",
      }),
      false,
    );
  });

  it("does not reserve inventory while card payment is pending", () => {
    assert.equal(
      bookingReservesRoom({
        status: "pending_payment",
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
      }),
      false,
    );
  });

  it("reserves inventory after card payment", () => {
    assert.equal(
      bookingReservesRoom({
        status: "pending_payment",
        deposit_paid_at: "2026-07-18T07:00:00.000Z",
        bank_transfer_claimed_at: null,
      }),
      true,
    );
  });

  it("reserves inventory once staff confirms a bank transfer", () => {
    assert.equal(
      bookingReservesRoom({
        status: "confirmed",
        deposit_paid_at: "2026-07-18T09:00:00.000Z",
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

describe("bookingBlocksCalendarExport", () => {
  it("blocks export only for stays that hold inventory", () => {
    assert.equal(bookingBlocksCalendarExport({ status: "new" }), false);
    assert.equal(
      bookingBlocksCalendarExport({
        status: "pending_payment",
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
      }),
      false,
    );
    assert.equal(
      bookingBlocksCalendarExport({
        status: "awaiting",
        bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      bookingBlocksCalendarExport({
        status: "confirmed",
        deposit_paid_at: "2026-07-18T09:00:00.000Z",
        bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
      }),
      true,
    );
  });

  it("does not block export for declined requests", () => {
    assert.equal(bookingBlocksCalendarExport({ status: "declined" }), false);
  });
});
