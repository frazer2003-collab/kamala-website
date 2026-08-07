import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCalendarBooking,
  isInventoryHoldBooking,
  isPendingBooking,
  mapBookingRequest,
} from "./booking-requests";
import { bookingReservesRoom } from "./booking-reservation";
import type { BookingRequestRow } from "./supabase";

const bankClaimRow: BookingRequestRow = {
  id: "11111111-1111-1111-1111-111111111111",
  guest_name: "Nok",
  guest_email: "nok@example.com",
  guest_phone: "",
  room_id: "superior",
  room_name: "Superior",
  arrival_date: "2026-08-01",
  departure_date: "2026-08-03",
  nights: 2,
  estimated_total: 1400,
  note: null,
  staff_note: null,
  stay_status: "expected",
  status: "awaiting",
  deposit_amount: 1400,
  deposit_paid_at: null,
  booking_source: "walk-in",
  stripe_checkout_session_id: null,
  stripe_payment_intent_id: null,
  bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
  conversation_token: null,
  room_unit_id: null,
  bed_setup: "double",
  created_at: "2026-07-18T08:00:00.000Z",
  updated_at: "2026-07-18T08:00:00.000Z",
};

describe("staff booking requests", () => {
  it("maps an unpaid bank transfer claim into the staff booking", () => {
    const booking = mapBookingRequest(bankClaimRow);

    assert.equal(booking.depositPaid, false);
    assert.equal(booking.bankTransferClaimed, true);
    assert.equal(booking.bookingSource, "walk-in");
  });

  it("keeps an unpaid bank transfer claim in the pending inbox", () => {
    assert.equal(isPendingBooking(mapBookingRequest(bankClaimRow)), true);
  });

  it("keeps paid needs-reply stays on the calendar tape", () => {
    const paidNeedsReply = mapBookingRequest({
      ...bankClaimRow,
      status: "needs-reply",
      deposit_paid_at: "2026-07-18T08:00:00.000Z",
      bank_transfer_claimed_at: null,
    });

    assert.equal(isCalendarBooking(paidNeedsReply), true);
    assert.equal(isPendingBooking(paidNeedsReply), true);
  });

  it("does not put unpaid needs-reply on the calendar", () => {
    const unpaid = mapBookingRequest({
      ...bankClaimRow,
      status: "needs-reply",
      deposit_paid_at: null,
      bank_transfer_claimed_at: null,
    });

    assert.equal(isCalendarBooking(unpaid), false);
  });

  it("keeps unverified bank claims off the calendar until Requests approval", () => {
    const pendingPayment = mapBookingRequest({
      ...bankClaimRow,
      status: "pending_payment",
      deposit_paid_at: null,
      bank_transfer_claimed_at: null,
    });
    const bankHold = mapBookingRequest(bankClaimRow);

    // Card checkout holds can still show on the tape as awaiting payment.
    assert.equal(isCalendarBooking(pendingPayment), true);
    assert.equal(isInventoryHoldBooking(pendingPayment), true);
    // Thai bank “I’ve paid” — Requests only until staff confirm.
    assert.equal(isCalendarBooking(bankHold), false);
    assert.equal(isInventoryHoldBooking(bankHold), true);
    assert.equal(
      bookingReservesRoom({
        status: pendingPayment.status,
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
      }),
      true,
    );
    assert.equal(
      bookingReservesRoom({
        status: bankHold.status,
        deposit_paid_at: null,
        bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
      }),
      true,
    );
  });

  it("puts confirmed bank transfers on the calendar after approval", () => {
    const approved = mapBookingRequest({
      ...bankClaimRow,
      status: "confirmed",
      deposit_paid_at: "2026-07-18T09:00:00.000Z",
      bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
    });

    assert.equal(isCalendarBooking(approved), true);
    assert.equal(isInventoryHoldBooking(approved), false);
  });
});
