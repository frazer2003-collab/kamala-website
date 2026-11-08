import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffBooking } from "./booking-requests";
import {
  getStaffNotificationKind,
  getStaffNotificationReason,
  matchesStaffNotificationFilter,
  parseStaffNotificationFilter,
} from "./staff-notifications";

function booking(
  partial: Partial<StaffBooking> & Pick<StaffBooking, "id" | "status">,
): StaffBooking {
  return {
    databaseId: partial.databaseId ?? partial.id,
    id: partial.id,
    guest: partial.guest ?? "Guest",
    room: partial.room ?? "Family GF",
    dates: "2026-08-10 - 2026-08-12",
    nights: 2,
    status: partial.status,
    requestedAt: "Recently",
    createdAt: "2026-07-01T04:00:00.000Z",
    note: "",
    contact: "g@example.com",
    phone: "",
    arrivalDate: "2026-08-10",
    departureDate: "2026-08-12",
    roomId: "ground",
    estimatedTotal: 1000,
    depositAmount: 300,
    depositPaid: partial.depositPaid ?? false,
    bookingSource: null,
    bankTransferClaimed: partial.bankTransferClaimed ?? false,
    stripePaymentIntentId: null,
    stayStatus: "expected",
    stayEndReason: null,
    staffNote: "",
    roomUnitId: "unit-1",
    roomNumber: "116",
    bedSetup: null,
    refundDue: partial.refundDue,
    pendingStayChange: partial.pendingStayChange,
  };
}

describe("staff notifications", () => {
  it("maps money / reply / new filters and legacy aliases", () => {
    assert.equal(parseStaffNotificationFilter("awaiting"), "money");
    assert.equal(parseStaffNotificationFilter("needs-reply"), "reply");
    assert.equal(parseStaffNotificationFilter("money"), "money");

    const bank = booking({
      id: "b1",
      status: "awaiting",
      bankTransferClaimed: true,
      depositPaid: false,
    });
    assert.equal(getStaffNotificationKind(bank), "bank");
    assert.equal(getStaffNotificationReason(bank), "Verify transfer");
    assert.equal(matchesStaffNotificationFilter(bank, "money"), true);
    assert.equal(matchesStaffNotificationFilter(bank, "reply"), false);

    const reply = booking({ id: "r1", status: "needs-reply" });
    assert.equal(getStaffNotificationReason(reply), "Reply to guest");
    assert.equal(matchesStaffNotificationFilter(reply, "reply"), true);
  });
});
