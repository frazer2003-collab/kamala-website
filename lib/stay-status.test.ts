import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveStayStatusFromDates } from "./stay-status";

describe("resolveStayStatusFromDates", () => {
  it("returns expected before arrival", () => {
    assert.equal(
      resolveStayStatusFromDates("2026-08-10", "2026-08-12", "2026-08-09"),
      "expected",
    );
  });

  it("returns checked-in on arrival through night before departure", () => {
    assert.equal(
      resolveStayStatusFromDates("2026-08-10", "2026-08-12", "2026-08-10"),
      "checked-in",
    );
    assert.equal(
      resolveStayStatusFromDates("2026-08-10", "2026-08-12", "2026-08-11"),
      "checked-in",
    );
  });

  it("returns checked-out on departure day and after", () => {
    assert.equal(
      resolveStayStatusFromDates("2026-08-10", "2026-08-12", "2026-08-12"),
      "checked-out",
    );
    assert.equal(
      resolveStayStatusFromDates("2026-08-10", "2026-08-12", "2026-08-15"),
      "checked-out",
    );
  });
});
