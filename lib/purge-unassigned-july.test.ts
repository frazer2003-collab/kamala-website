import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stayOverlapsJuly2026 } from "@/lib/purge-unassigned-july";

describe("stayOverlapsJuly2026", () => {
  it("includes stays wholly inside July", () => {
    assert.equal(stayOverlapsJuly2026("2026-07-10", "2026-07-14"), true);
  });

  it("includes stays that start in June and end in July", () => {
    assert.equal(stayOverlapsJuly2026("2026-06-28", "2026-07-03"), true);
  });

  it("includes stays that start in July and end in August", () => {
    assert.equal(stayOverlapsJuly2026("2026-07-30", "2026-08-02"), true);
  });

  it("excludes June-only stays", () => {
    assert.equal(stayOverlapsJuly2026("2026-06-20", "2026-07-01"), false);
  });

  it("excludes August-only stays", () => {
    assert.equal(stayOverlapsJuly2026("2026-08-01", "2026-08-05"), false);
  });
});
