import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffBooking } from "./booking-requests";
import {
  bangkokPickupMs,
  homeDeepCleanDue,
  isTourPickupOnHomeBoard,
  parsePickupTime,
  stayNeedsDeepClean,
} from "./staff-home-board";

function cleanBooking(
  partial: Partial<StaffBooking> &
    Pick<StaffBooking, "id" | "arrivalDate" | "departureDate">,
): StaffBooking & { housekeepingCleanedOn?: string | null } {
  return {
    databaseId: partial.databaseId ?? partial.id,
    id: partial.id,
    guest: partial.guest ?? "Guest",
    room: partial.room ?? "Superior",
    dates: "",
    nights: 5,
    status: "confirmed",
    requestedAt: "",
    createdAt: null,
    note: "",
    contact: "",
    phone: "",
    arrivalDate: partial.arrivalDate,
    departureDate: partial.departureDate,
    roomId: "courtyard",
    estimatedTotal: 0,
    depositAmount: 0,
    depositPaid: true,
    bookingSource: "walk-in",
    bankTransferClaimed: false,
    stripePaymentIntentId: null,
    stayStatus: "checked-in",
    stayEndReason: null,
    staffNote: "",
    roomUnitId: null,
    roomNumber: "101",
    bedSetup: null,
    housekeepingCleanedOn: partial.housekeepingCleanedOn ?? null,
  };
}

describe("tour pickup home window", () => {
  it("parses HH:MM pickup times", () => {
    assert.equal(parsePickupTime("9:05"), "09:05");
    assert.equal(parsePickupTime("14:30:00"), "14:30");
    assert.equal(parsePickupTime("nope"), null);
  });

  it("shows from 24h before pickup until 6h after", () => {
    const pickupMs = bangkokPickupMs("2026-11-10", "10:00");
    assert.ok(pickupMs);

    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! - 23 * 60 * 60 * 1000,
      }),
      true,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! - 25 * 60 * 60 * 1000,
      }),
      false,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! + 5 * 60 * 60 * 1000,
      }),
      true,
    );
    assert.equal(
      isTourPickupOnHomeBoard({
        tripDate: "2026-11-10",
        pickupTime: "10:00",
        nowMs: pickupMs! + 7 * 60 * 60 * 1000,
      }),
      false,
    );
  });
});

describe("deep clean due", () => {
  it("flags in-house stays after 3 nights since arrival or last clean", () => {
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: null,
        todayIso: "2026-11-11",
      }),
      true,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: null,
        todayIso: "2026-11-10",
      }),
      false,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: "2026-11-11",
        todayIso: "2026-11-13",
      }),
      false,
    );
    assert.equal(
      stayNeedsDeepClean({
        arrivalDate: "2026-11-08",
        departureDate: "2026-11-15",
        cleanedOn: "2026-11-11",
        todayIso: "2026-11-14",
      }),
      true,
    );
  });

  it("keeps cleaned stays on the list, greyed at the bottom", () => {
    const rows = homeDeepCleanDue(
      [
        cleanBooking({
          id: "due",
          guest: "Due",
          arrivalDate: "2026-11-08",
          departureDate: "2026-11-20",
          housekeepingCleanedOn: null,
        }),
        cleanBooking({
          id: "done",
          guest: "Done",
          arrivalDate: "2026-11-08",
          departureDate: "2026-11-20",
          housekeepingCleanedOn: "2026-11-11",
        }),
      ],
      "2026-11-12",
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.id, "due");
    assert.equal(rows[0]?.cleaned, false);
    assert.equal(rows[1]?.id, "done");
    assert.equal(rows[1]?.cleaned, true);
  });
});
