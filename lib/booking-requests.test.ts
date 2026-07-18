import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPendingBooking,
  mapBookingRequest,
} from "./booking-requests";
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
  stripe_checkout_session_id: null,
  stripe_payment_intent_id: null,
  bank_transfer_claimed_at: "2026-07-18T08:00:00.000Z",
  conversation_token: null,
  room_unit_id: null,
  created_at: "2026-07-18T08:00:00.000Z",
  updated_at: "2026-07-18T08:00:00.000Z",
};

describe("staff booking requests", () => {
  it("maps an unpaid bank transfer claim into the staff booking", () => {
    const booking = mapBookingRequest(bankClaimRow);

    assert.equal(booking.depositPaid, false);
    assert.equal(booking.bankTransferClaimed, true);
  });

  it("keeps an unpaid bank transfer claim in the pending inbox", () => {
    assert.equal(isPendingBooking(mapBookingRequest(bankClaimRow)), true);
  });
});
