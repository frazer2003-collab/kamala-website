import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveConfirmPaidAt } from "@/lib/booking-confirm";

const NOW = "2026-10-03T08:30:00.000Z";

describe("resolveConfirmPaidAt", () => {
  it("keeps the original paid time for a card-paid stay", () => {
    assert.equal(
      resolveConfirmPaidAt({
        status: "confirmed",
        depositPaidAt: "2026-09-01T10:00:00.000Z",
        bankTransferClaimedAt: null,
        now: NOW,
      }),
      "2026-09-01T10:00:00.000Z",
    );
  });

  it("prefers the paid time over a later claim", () => {
    assert.equal(
      resolveConfirmPaidAt({
        status: "awaiting",
        depositPaidAt: "2026-09-01T10:00:00.000Z",
        bankTransferClaimedAt: "2026-09-02T10:00:00.000Z",
        now: NOW,
      }),
      "2026-09-01T10:00:00.000Z",
    );
  });

  it("uses the guest's claim time when they tapped I've paid", () => {
    assert.equal(
      resolveConfirmPaidAt({
        status: "awaiting",
        depositPaidAt: null,
        bankTransferClaimedAt: "2026-10-02T04:00:00.000Z",
        now: NOW,
      }),
      "2026-10-02T04:00:00.000Z",
    );
  });

  it("stamps now when the guest never reported the transfer", () => {
    assert.equal(
      resolveConfirmPaidAt({
        status: "pending_payment",
        depositPaidAt: null,
        bankTransferClaimedAt: null,
        now: NOW,
      }),
      NOW,
    );
  });

  it("leaves a request with no checkout behind it unpaid", () => {
    for (const status of ["new", "needs-reply", "awaiting"]) {
      assert.equal(
        resolveConfirmPaidAt({
          status,
          depositPaidAt: null,
          bankTransferClaimedAt: null,
          now: NOW,
        }),
        null,
        `${status} should stay unpaid`,
      );
    }
  });
});
