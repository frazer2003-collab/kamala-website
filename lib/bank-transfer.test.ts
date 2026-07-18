import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasBankAccountDetails,
  hasPromptPayId,
  isBankTransferConfigured,
} from "./bank-transfer";

const emptyDetails = {
  promptPayId: null,
  bankName: null,
  accountName: null,
  accountNumber: null,
};

describe("hasPromptPayId", () => {
  it("returns true when promptPayId is non-empty after trim", () => {
    assert.equal(hasPromptPayId({ ...emptyDetails, promptPayId: "0812345678" }), true);
    assert.equal(hasPromptPayId({ ...emptyDetails, promptPayId: " 0812345678 " }), true);
  });

  it("returns false when promptPayId is null, empty, or whitespace", () => {
    assert.equal(hasPromptPayId({ ...emptyDetails, promptPayId: null }), false);
    assert.equal(hasPromptPayId({ ...emptyDetails, promptPayId: "" }), false);
    assert.equal(hasPromptPayId({ ...emptyDetails, promptPayId: "   " }), false);
  });
});

describe("hasBankAccountDetails", () => {
  it("returns true when bank name, account name, and account number are all non-empty", () => {
    assert.equal(
      hasBankAccountDetails({
        ...emptyDetails,
        bankName: "Bangkok Bank",
        accountName: "Kamala Guesthouse",
        accountNumber: "1234567890",
      }),
      true,
    );
  });

  it("returns true when all three fields are non-empty after trim", () => {
    assert.equal(
      hasBankAccountDetails({
        ...emptyDetails,
        bankName: " Bangkok Bank ",
        accountName: " Kamala Guesthouse ",
        accountNumber: " 1234567890 ",
      }),
      true,
    );
  });

  it("returns false when any bank field is missing or blank", () => {
    const partial = {
      ...emptyDetails,
      bankName: "Bangkok Bank",
      accountName: "Kamala Guesthouse",
      accountNumber: "1234567890",
    };
    assert.equal(hasBankAccountDetails({ ...partial, bankName: null }), false);
    assert.equal(hasBankAccountDetails({ ...partial, accountName: "" }), false);
    assert.equal(hasBankAccountDetails({ ...partial, accountNumber: "   " }), false);
  });
});

describe("isBankTransferConfigured", () => {
  it("returns true when PromptPay ID is configured", () => {
    assert.equal(
      isBankTransferConfigured({ ...emptyDetails, promptPayId: "0812345678" }),
      true,
    );
  });

  it("returns true when bank account details are complete", () => {
    assert.equal(
      isBankTransferConfigured({
        ...emptyDetails,
        bankName: "Bangkok Bank",
        accountName: "Kamala Guesthouse",
        accountNumber: "1234567890",
      }),
      true,
    );
  });

  it("returns false when neither path is complete", () => {
    assert.equal(isBankTransferConfigured(emptyDetails), false);
    assert.equal(
      isBankTransferConfigured({
        ...emptyDetails,
        bankName: "Bangkok Bank",
        accountName: "Kamala Guesthouse",
      }),
      false,
    );
  });
});
