import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashStaffPassword,
  isStaffPasswordValid,
  verifyStaffPassword,
} from "@/lib/staff-password";

describe("staff password hashing", () => {
  it("validates minimum length", () => {
    assert.equal(isStaffPasswordValid("short"), false);
    assert.equal(isStaffPasswordValid("long-enough"), true);
  });

  it("hashes and verifies a password", async () => {
    const hash = await hashStaffPassword("front-desk-9");
    assert.match(hash, /^scrypt:/);
    assert.equal(await verifyStaffPassword("front-desk-9", hash), true);
    assert.equal(await verifyStaffPassword("wrong-password", hash), false);
  });
});
