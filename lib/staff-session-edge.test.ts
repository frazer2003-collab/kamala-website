import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { createStaffSessionToken, readStaffSessionFromToken } from "@/lib/staff-auth";
import {
  readStaffSessionFromTokenEdge,
  signStaffSessionPayloadEdge,
} from "@/lib/staff-session-edge";

describe("staff session edge compatibility", () => {
  it("matches Node HMAC signatures with Web Crypto", async () => {
    const previousSecret = process.env.STAFF_SESSION_SECRET;
    const previousPassword = process.env.STAFF_ADMIN_PASSWORD;
    process.env.STAFF_SESSION_SECRET = "test-session-secret";
    process.env.STAFF_ADMIN_PASSWORD = "test-admin-password";

    try {
      const payload = "test-payload";
      const nodeSignature = createHmac("sha256", process.env.STAFF_SESSION_SECRET)
        .update(payload)
        .digest("base64url");
      const edgeSignature = await signStaffSessionPayloadEdge(
        payload,
        process.env.STAFF_SESSION_SECRET,
      );

      assert.equal(edgeSignature, nodeSignature);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.STAFF_SESSION_SECRET;
      } else {
        process.env.STAFF_SESSION_SECRET = previousSecret;
      }

      if (previousPassword === undefined) {
        delete process.env.STAFF_ADMIN_PASSWORD;
      } else {
        process.env.STAFF_ADMIN_PASSWORD = previousPassword;
      }
    }
  });

  it("reads tokens created on the server from edge verification", async () => {
    const previousSecret = process.env.STAFF_SESSION_SECRET;
    const previousPassword = process.env.STAFF_ADMIN_PASSWORD;
    process.env.STAFF_SESSION_SECRET = "test-session-secret";
    process.env.STAFF_ADMIN_PASSWORD = "test-admin-password";

    try {
      const token = createStaffSessionToken({
        calendarAccess: "read_write",
        subject: "admin",
      });

      assert.deepEqual(readStaffSessionFromToken(token), {
        calendarAccess: "read_write",
        subject: "admin",
      });
      assert.deepEqual(await readStaffSessionFromTokenEdge(token), {
        calendarAccess: "read_write",
        subject: "admin",
      });
    } finally {
      if (previousSecret === undefined) {
        delete process.env.STAFF_SESSION_SECRET;
      } else {
        process.env.STAFF_SESSION_SECRET = previousSecret;
      }

      if (previousPassword === undefined) {
        delete process.env.STAFF_ADMIN_PASSWORD;
      } else {
        process.env.STAFF_ADMIN_PASSWORD = previousPassword;
      }
    }
  });
});
