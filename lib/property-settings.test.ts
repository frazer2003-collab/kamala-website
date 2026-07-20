import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPropertySettingsRow, type PropertySettingsInput } from "./property-settings";

describe("toPropertySettingsRow", () => {
  it("maps bank transfer settings to database columns", () => {
    const input: PropertySettingsInput = {
      propertyName: "Kamala's Boutique Guesthouse",
      propertyTagline: "Chiang Mai Old City",
      contactEmail: null,
      contactPhone: null,
      addressLine: null,
      checkInFrom: "3:00 pm",
      checkInUntil: "8:00 pm",
      quietHours: "10:00 pm",
      currency: "thb",
      allowPayOnArrival: false,
      houseRules: [],
      cancellationPolicy: "",
      privacyPolicy: "",
      termsSummary: "",
      lineUrl: null,
      whatsappUrl: null,
      promptPayId: "0812345678",
      bankName: "Bangkok Bank",
      accountName: "Kamala Guesthouse",
      accountNumber: "1234567890",
      calendarColors: {
        available: "#bbf7d0",
        closed: "#fecaca",
        booking: "#fef08a",
        soldOut: "#fdba74",
      },
    };

    const row = toPropertySettingsRow(input);

    assert.equal(row.promptpay_id, "0812345678");
    assert.equal(row.bank_name, "Bangkok Bank");
    assert.equal(row.account_name, "Kamala Guesthouse");
    assert.equal(row.account_number, "1234567890");
  });
});
