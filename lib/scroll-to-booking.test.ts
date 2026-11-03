import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("scrollToBookingForm", () => {
  it("waits for #booking when the form mounts after Book now", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/scroll-to-booking.ts"),
      "utf8",
    );
    assert.match(source, /getElementById\("booking"\)/);
    assert.match(source, /requestAnimationFrame/);
  });
});
