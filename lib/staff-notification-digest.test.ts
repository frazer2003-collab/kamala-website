import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffBooking } from "./booking-requests";
import type { StaffDeskNotification } from "./staff-desk-notifications";
import {
  buildNotificationDigest,
  collapseLifecycleNoise,
  parseNotificationFocus,
} from "./staff-notification-digest";

function notice(
  partial: Partial<StaffDeskNotification> &
    Pick<StaffDeskNotification, "id" | "kind" | "title">,
): StaffDeskNotification {
  return {
    id: partial.id,
    kind: partial.kind,
    title: partial.title,
    body: partial.body ?? "",
    bookingId: partial.bookingId ?? null,
    tripSaleId: null,
    stayArrival: partial.stayArrival ?? "2026-12-01",
    stayDeparture: partial.stayDeparture ?? "2026-12-03",
    href: partial.href ?? null,
    readAt: partial.readAt ?? null,
    createdAt: partial.createdAt ?? "2026-11-08T10:00:00.000Z",
  };
}

function booking(
  partial: Partial<StaffBooking> & Pick<StaffBooking, "id" | "status">,
): StaffBooking {
  return {
    databaseId: partial.databaseId ?? partial.id,
    id: partial.id,
    guest: partial.guest ?? "Ada",
    room: partial.room ?? "Family GF",
    dates: "1–3 Dec",
    nights: 2,
    status: partial.status,
    requestedAt: "Recently",
    createdAt: "2026-11-01T04:00:00.000Z",
    note: "",
    contact: "a@example.com",
    phone: "",
    arrivalDate: "2026-12-01",
    departureDate: "2026-12-03",
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

describe("notification digest", () => {
  it("collapses created when the same booking was confirmed", () => {
    const rows = collapseLifecycleNoise([
      notice({
        id: "1",
        kind: "booking_confirmed",
        title: "Ada · confirmed",
        bookingId: "b1",
      }),
      notice({
        id: "2",
        kind: "booking_created",
        title: "Ada · new booking",
        bookingId: "b1",
      }),
      notice({
        id: "3",
        kind: "booking_created",
        title: "Bo · new booking",
        bookingId: "b2",
      }),
    ]);
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.id !== "2"));
  });

  it("puts live reply/bank work in Needs you and keeps confirms in activity", () => {
    const digest = buildNotificationDigest({
      notifications: [
        notice({
          id: "c1",
          kind: "booking_confirmed",
          title: "Ada · confirmed",
          bookingId: "b1",
        }),
        notice({
          id: "r1",
          kind: "reply_needed",
          title: "Old · needs reply",
          bookingId: "old",
          readAt: "2026-11-08T09:00:00.000Z",
        }),
      ],
      openBookings: [
        booking({
          id: "live1",
          status: "needs-reply",
          guest: "Nok",
        }),
        booking({
          id: "live2",
          status: "awaiting",
          guest: "Bank",
          bankTransferClaimed: true,
          depositPaid: false,
        }),
      ],
    });

    assert.equal(digest.summary.actionCount, 2);
    assert.equal(digest.summary.replyCount, 1);
    assert.equal(digest.summary.moneyCount, 1);
    assert.equal(digest.actionItems.length, 2);
    assert.ok(digest.actionItems.some((row) => row.guestLabel === "Nok"));
    assert.ok(digest.activityItems.some((row) => row.kind === "booking_confirmed"));
    assert.equal(parseNotificationFocus("messages"), "messages");
  });
});
