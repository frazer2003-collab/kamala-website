import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Room } from "@/lib/content";
import { computeGuestNightAvailability } from "@/lib/guest-night-availability-core";
import {
  canGuestChangeStay,
  describeStayChangeOutcome,
  isSameStay,
  resolveStayChangeOutcome,
  resolveStayChangePayment,
} from "@/lib/guest-stay-change";

const thb = (amount: number) => `${amount} THB`;

describe("resolveStayChangeOutcome", () => {
  it("asks for nothing when the price is the same", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2100,
      newTotal: 2100,
      payment: "card",
    });
    assert.deepEqual(outcome, { kind: "same", newTotal: 2100 });
    assert.equal(describeStayChangeOutcome(outcome, thb).sentence, "No extra to pay.");
  });

  it("charges a card top-up with the card fee on the difference only", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2100,
      newTotal: 2800,
      payment: "card",
    });
    assert.deepEqual(outcome, {
      kind: "pay-card",
      newTotal: 2800,
      difference: 700,
      surcharge: 42,
      totalDue: 742,
    });
    assert.equal(describeStayChangeOutcome(outcome, thb).action, "Pay 742 THB");
  });

  it("waives a card top-up below the processor minimum", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2100,
      newTotal: 2105,
      payment: "card",
      minimumCardCharge: 10,
    });
    assert.equal(outcome.kind, "same");
  });

  it("asks a bank payer to transfer the difference with no fee", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2100,
      newTotal: 2800,
      payment: "bank",
    });
    assert.deepEqual(outcome, { kind: "pay-bank", newTotal: 2800, difference: 700 });
  });

  it("refunds a card payer the stay difference", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2800,
      newTotal: 2100,
      payment: "card",
    });
    assert.deepEqual(outcome, { kind: "refund-card", newTotal: 2100, difference: 700 });
  });

  it("queues a bank refund for staff", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2800,
      newTotal: 2100,
      payment: "bank",
    });
    assert.deepEqual(outcome, { kind: "refund-bank", newTotal: 2100, difference: 700 });
  });

  it("only restates the total when nothing has been paid yet", () => {
    const outcome = resolveStayChangeOutcome({
      currentTotal: 2100,
      newTotal: 2800,
      payment: "unpaid",
    });
    assert.deepEqual(outcome, { kind: "unpaid", newTotal: 2800 });
  });
});

describe("resolveStayChangePayment", () => {
  it("reads card, bank and unpaid stays", () => {
    assert.equal(
      resolveStayChangePayment({ depositPaidAt: "2026-09-01", stripePaymentIntentId: "pi_1" }),
      "card",
    );
    assert.equal(
      resolveStayChangePayment({ depositPaidAt: "2026-09-01", stripePaymentIntentId: null }),
      "bank",
    );
    assert.equal(
      resolveStayChangePayment({ depositPaidAt: null, stripePaymentIntentId: "pi_1" }),
      "unpaid",
    );
  });
});

describe("canGuestChangeStay", () => {
  const base = {
    status: "confirmed",
    arrivalDate: "2026-10-10",
    todayIso: "2026-10-03",
    hasPendingChange: false,
  };

  it("allows a confirmed stay before arrival", () => {
    assert.deepEqual(canGuestChangeStay(base), { ok: true });
  });

  it("blocks unconfirmed, started and already-pending stays", () => {
    assert.equal(
      canGuestChangeStay({ ...base, status: "awaiting" }).ok,
      false,
    );
    assert.deepEqual(canGuestChangeStay({ ...base, arrivalDate: "2026-10-03" }), {
      ok: false,
      reason: "stay-started",
    });
    assert.deepEqual(canGuestChangeStay({ ...base, hasPendingChange: true }), {
      ok: false,
      reason: "change-pending",
    });
  });
});

describe("isSameStay", () => {
  it("compares room and both dates", () => {
    const stay = { roomId: "garden", arrivalDate: "2026-10-10", departureDate: "2026-10-12" };
    assert.equal(isSameStay(stay, { ...stay }), true);
    assert.equal(isSameStay(stay, { ...stay, departureDate: "2026-10-13" }), false);
  });
});

describe("own stay does not block itself", () => {
  const garden: Room = {
    id: "garden",
    name: "Garden",
    shortName: "Garden",
    rate: 700,
    sleeps: "2",
    outlook: "Garden",
    availableCount: 1,
    summary: "",
    amenities: [],
    tone: "garden",
    imageUrl: null,
    galleryUrls: [],
  };
  const ownBooking = {
    roomId: "garden",
    roomUnitId: null,
    arrivalDate: "2026-10-10",
    departureDate: "2026-10-12",
    databaseId: "booking-1",
    guest: "Guest",
  };
  const input = {
    rooms: [garden],
    fromIso: "2026-10-10",
    toIso: "2026-10-11",
    bookings: [ownBooking],
    channelBlocks: [],
    staffClosures: [],
    inventoryLookup: new Map<string, number>(),
    units: [],
  };

  it("greys the nights for everyone else", () => {
    const nights = computeGuestNightAvailability(input);
    assert.equal(nights["2026-10-10"], "full");
  });

  it("keeps them open for the guest who holds them", () => {
    const nights = computeGuestNightAvailability({
      ...input,
      excludeBookingId: "booking-1",
    });
    assert.equal(nights["2026-10-10"], "open");
    assert.equal(nights["2026-10-11"], "open");
  });
});
