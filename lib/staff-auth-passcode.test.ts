import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  verifyStaffSensitivePasscode,
  getStaffSensitivePasscode,
} from "@/lib/staff-auth";

describe("staff sensitive passcode", () => {
  it("defaults to 3135 when env is unset", () => {
    const previous = process.env.STAFF_SENSITIVE_PASSCODE;
    delete process.env.STAFF_SENSITIVE_PASSCODE;
    try {
      assert.equal(getStaffSensitivePasscode(), "3135");
      assert.equal(verifyStaffSensitivePasscode("3135"), true);
      assert.equal(verifyStaffSensitivePasscode("0000"), false);
      assert.equal(verifyStaffSensitivePasscode(""), false);
      assert.equal(verifyStaffSensitivePasscode("31350"), false);
    } finally {
      if (previous === undefined) {
        delete process.env.STAFF_SENSITIVE_PASSCODE;
      } else {
        process.env.STAFF_SENSITIVE_PASSCODE = previous;
      }
    }
  });
});
