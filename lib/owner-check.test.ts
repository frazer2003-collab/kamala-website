import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStaffInboxQuery,
  ownerDiscountHref,
  ownerRateAction,
  pickOwnerRateRoom,
} from "@/lib/owner-check";
import type { StaffInsightsRoomRow } from "@/lib/staff-insights";

function room(partial: Partial<StaffInsightsRoomRow> & Pick<StaffInsightsRoomRow, "roomId" | "roomName">): StaffInsightsRoomRow {
  return {
    nightsSold: 0,
    nightsAvailable: 0,
    soldPercent: null,
    nightsOverCapacity: 0,
    stayCount: 0,
    websiteRevenue: 0,
    bankCharge: 0,
    earnedRoomRevenue: 0,
    earnedBankCharge: 0,
    earnedPricedNights: 0,
    channelRevenue: 0,
    estimatedRevenue: 0,
    earnedRevenue: 0,
    unearnedRevenue: 0,
    unpricedNights: 0,
    recordedStayCount: 0,
    isUnconfigured: false,
    sources: [],
    publishedRate: 700,
    pricedNights: 0,
    agreedNightlyRate: null,
    nightsStillOpen: 0,
    priceCue: "",
    collected: 0,
    collectedEarned: 0,
    collectedBankCharge: 0,
    unpaid: 0,
    unpaidEarned: 0,
    bankClaimedUnpaid: 0,
    refundsToSend: 0,
    attention: [],
    ...partial,
  };
}

describe("isStaffInboxQuery", () => {
  it("opens the check when the owner lands with no request selected", () => {
    assert.equal(isStaffInboxQuery({}), false);
  });

  it("keeps a booking link on the request inbox", () => {
    assert.equal(isStaffInboxQuery({ booking: "abc", view: undefined }), true);
    assert.equal(isStaffInboxQuery({ view: "inbox" }), true);
  });
});

describe("pickOwnerRateRoom", () => {
  it("picks the room furthest from its published rate", () => {
    const picked = pickOwnerRateRoom([
      room({
        roomId: "close",
        roomName: "Close",
        publishedRate: 700,
        agreedNightlyRate: 680,
        pricedNights: 2,
      }),
      room({
        roomId: "far",
        roomName: "Far",
        publishedRate: 1100,
        agreedNightlyRate: 700,
        pricedNights: 2,
      }),
    ]);

    assert.equal(picked?.roomId, "far");
  });
});

describe("ownerRateAction", () => {
  it("opens discounts for the room when the cue is a short discount", () => {
    const action = ownerRateAction(
      room({
        roomId: "superior",
        roomName: "Superior",
        nightsStillOpen: 3,
        priceCue:
          "Guests paid close to the published rate, and nights are still open. A short discount on the empty nights can fill them.",
      }),
      "2026-10-27",
      "2026-10-31",
    );

    assert.equal(action.label, "Discount the empty nights");
    assert.equal(action.href, ownerDiscountHref("superior"));
  });
});
