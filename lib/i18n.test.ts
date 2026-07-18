import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { t } from "./i18n";

describe("payment error translations", () => {
  it("provides localized bank claim and card start errors", () => {
    assert.notEqual(t("en", "bankTransferClaimFailed"), "");
    assert.notEqual(t("th", "bankTransferClaimFailed"), "");
    assert.notEqual(t("en", "card_already_paid"), "");
    assert.notEqual(t("th", "card_already_paid"), "");
    assert.notEqual(t("en", "card_processing"), "");
    assert.notEqual(t("th", "card_processing"), "");
    assert.notEqual(t("en", "cardPaymentStartFailed"), "");
    assert.notEqual(t("th", "cardPaymentStartFailed"), "");
  });

  it("does not direct guests to missing bank details after QR failure", () => {
    assert.match(t("en", "bankTransferQrUnavailableNoAccount"), /card|staff/i);
    assert.doesNotMatch(t("en", "bankTransferQrUnavailableNoAccount"), /below/i);
    assert.notEqual(t("th", "bankTransferQrUnavailableNoAccount"), "");
  });
});
