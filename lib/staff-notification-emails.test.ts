import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveStaffNotificationRecipients,
  type StaffNotificationEmail,
} from "./staff-notification-emails";

function entry(
  partial: Partial<StaffNotificationEmail> & Pick<StaffNotificationEmail, "email" | "calendarAccess">,
): StaffNotificationEmail {
  return {
    id: partial.id ?? partial.email,
    label: partial.label ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
    email: partial.email,
    calendarAccess: partial.calendarAccess,
  };
}

describe("staff notification recipients", () => {
  it("prefers read/write calendar addresses", () => {
    assert.deepEqual(
      resolveStaffNotificationRecipients([
        entry({ email: "read@example.com", calendarAccess: "read" }),
        entry({ email: "write@example.com", calendarAccess: "read_write" }),
      ]),
      ["write@example.com"],
    );
  });

  it("falls back to every saved address when none are read/write", () => {
    assert.deepEqual(
      resolveStaffNotificationRecipients([
        entry({ email: "a@example.com", calendarAccess: "read" }),
        entry({ email: "b@example.com", calendarAccess: "read" }),
      ]),
      ["a@example.com", "b@example.com"],
    );
  });

  it("uses the env fallback only when no staff emails are saved", () => {
    assert.deepEqual(
      resolveStaffNotificationRecipients([], "ops@example.com"),
      ["ops@example.com"],
    );
    assert.deepEqual(resolveStaffNotificationRecipients([], "  "), []);
    assert.deepEqual(resolveStaffNotificationRecipients([]), []);
  });
});
