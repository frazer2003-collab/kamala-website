import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { staffBankPaymentToConfirmCopy } from "@/lib/email";

describe("staffBankPaymentToConfirmCopy", () => {
  it("alerts staff when bank / QR checkout starts, before I've paid", () => {
    const copy = staffBankPaymentToConfirmCopy({
      guestName: "Christiane DEHOY",
      guestEmail: "guest@example.com",
      guestPhone: "+66",
      roomName: "Deluxe Double Room with Balcony",
      arrivalDate: "2026-11-03",
      departureDate: "2026-11-06",
      nights: 3,
      amountLabel: "2,280 THB",
      staffUrl: "https://www.kamalaguesthouse.com/staff?view=inbox",
    });

    assert.match(copy.subject, /Thai bank \/ QR booking/i);
    assert.match(copy.text, /Thai bank or QR/i);
    assert.match(copy.text, /forget to tap I've paid/i);
    assert.match(copy.text, /2,280 THB/);
    assert.match(copy.text, /Open Transfers/);
    assert.match(copy.html, /Open in Transfers/);
  });
});
