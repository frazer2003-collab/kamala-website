import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatStaffPatchDate,
  getLatestStaffPatchNote,
  STAFF_PATCH_NOTES,
} from "./staff-patch-notes";

describe("staff patch notes", () => {
  it("keeps newest notes first and exposes a Home summary", () => {
    assert.ok(STAFF_PATCH_NOTES.length > 0);
    const latest = getLatestStaffPatchNote();
    assert.equal(latest, STAFF_PATCH_NOTES[0]);
    assert.ok(latest?.summary);
    assert.ok((latest?.changes.length ?? 0) > 0);
    for (const note of STAFF_PATCH_NOTES) {
      assert.ok(note.image.src.startsWith("/staff/patch-notes/"));
      assert.ok(note.image.alt.length > 0);
    }
  });

  it("formats patch dates for staff", () => {
    assert.match(formatStaffPatchDate("2026-11-04"), /Nov/);
  });
});
