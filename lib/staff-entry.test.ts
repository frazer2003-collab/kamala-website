import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStaffLoginUrl,
  isInternalStaffReferer,
  isStaffProtectedPath,
} from "@/lib/staff-entry";

describe("staff entry guards", () => {
  it("marks staff routes except login as protected", () => {
    assert.equal(isStaffProtectedPath("/staff"), true);
    assert.equal(isStaffProtectedPath("/staff/calendar"), true);
    assert.equal(isStaffProtectedPath("/staff/login"), false);
    assert.equal(isStaffProtectedPath("/staff/login?next=/staff"), false);
    assert.equal(isStaffProtectedPath("/"), false);
  });

  it("treats same-site staff referer as in-app navigation", () => {
    const origin = "https://kamala.example";
    assert.equal(
      isInternalStaffReferer(`${origin}/staff/calendar`, origin),
      true,
    );
    assert.equal(
      isInternalStaffReferer(`${origin}/staff/login`, origin),
      true,
    );
    assert.equal(isInternalStaffReferer(`${origin}/`, origin), false);
    assert.equal(isInternalStaffReferer(null, origin), false);
    assert.equal(
      isInternalStaffReferer("https://other.example/staff", origin),
      false,
    );
  });

  it("builds login URLs with a safe next path", () => {
    const login = buildStaffLoginUrl("https://kamala.example", "/staff/sold", "?tab=1");
    assert.equal(login.pathname, "/staff/login");
    assert.equal(login.searchParams.get("next"), "/staff/sold?tab=1");
  });
});
