import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCalendarBooking,
  isInventoryHoldBooking,
  isPendingBooking,
  isStaffCancellableHold,
  isUnverifiedBankHold,
  mapBookingRequest,
  openRequestsHref,
  openRequestsWarningCopy,
  summarizeOpenRequests,
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

  it("does not hold inventory until bank I've paid is staff-confirmed or card payment", () => {
    const checkoutHold = mapBookingRequest({
      ...bankClaimRow,
      status: "pending_payment",
      deposit_paid_at: null,
      bank_transfer_claimed_at: null,
      stripe_payment_intent_id: null,
    });
    const cardCheckoutHold = mapBookingRequest({
      ...bankClaimRow,
      status: "pending_payment",
      deposit_paid_at: null,
      bank_transfer_claimed_at: null,
      stripe_payment_intent_id: "pi_test_123",
    });
    const bankHold = mapBookingRequest(bankClaimRow);

    // Unpaid checkout — Requests only; dates stay open for other guests.
    assert.equal(isCalendarBooking(checkoutHold), false);
    assert.equal(isPendingBooking(checkoutHold), true);
    assert.equal(isInventoryHoldBooking(checkoutHold), false);
    assert.equal(isCalendarBooking(cardCheckoutHold), false);
    assert.equal(isPendingBooking(cardCheckoutHold), false);
    assert.equal(isInventoryHoldBooking(cardCheckoutHold), false);
    // Thai bank “I've paid” — Requests until staff confirm; dates stay open.
    assert.equal(isCalendarBooking(bankHold), false);
    assert.equal(isInventoryHoldBooking(bankHold), false);
    assert.equal(
      bookingReservesRoom({
        status: checkoutHold.status,
        deposit_paid_at: null,
        bank_transfer_claimed_at: null,
      }),
      false,
    );
    assert.equal(
      bookingReservesRoom({
        status: bankHold.status,
        deposit_paid_at: null,
        bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
      }),
      false,
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

  it("summarizes open requests for calendar warnings", () => {
    const bookings = [
      mapBookingRequest({ ...bankClaimRow, status: "needs-reply", deposit_paid_at: "2026-07-18T08:00:00.000Z", bank_transfer_claimed_at: null }),
      mapBookingRequest({ ...bankClaimRow, status: "pending_payment", deposit_paid_at: null, bank_transfer_claimed_at: null, stripe_payment_intent_id: null }),
      mapBookingRequest({ ...bankClaimRow, status: "awaiting", bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z" }),
    ];

    const summary = summarizeOpenRequests(bookings);
    assert.deepEqual(summary, {
      total: 3,
      needsReply: 1,
      checkoutHolds: 1,
      awaitingPayment: 1,
      newRequests: 0,
    });
    assert.equal(
      openRequestsWarningCopy(summary),
      "3 open requests in Requests — 1 waiting for a reply, 1 checkout hold, 1 payment review. Review there before assigning doors on the calendar.",
    );
    assert.equal(openRequestsHref(summary), "/staff?filter=needs-reply&view=inbox");
    assert.equal(openRequestsWarningCopy({ total: 0, needsReply: 0, checkoutHolds: 0, awaitingPayment: 0, newRequests: 0 }), null);
  });

  it("flags holds staff can cancel from Requests", () => {
    const checkoutHold = mapBookingRequest({
      ...bankClaimRow,
      status: "pending_payment",
      deposit_paid_at: null,
      bank_transfer_claimed_at: null,
    });
    const bankHold = mapBookingRequest(bankClaimRow);
    const paid = mapBookingRequest({
      ...bankClaimRow,
      status: "confirmed",
      deposit_paid_at: "2026-07-18T09:00:00.000Z",
    });

    assert.equal(isUnverifiedBankHold(bankHold), true);
    assert.equal(isStaffCancellableHold(checkoutHold), true);
    assert.equal(isStaffCancellableHold(bankHold), true);
    assert.equal(isStaffCancellableHold(paid), false);
  });
});
