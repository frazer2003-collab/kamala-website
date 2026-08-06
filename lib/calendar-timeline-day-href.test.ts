import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTimelineDayHref } from "./calendar-timeline";

describe("getTimelineDayHref", () => {
  it("opens the day panel for a room and date", () => {
    const href = getTimelineDayHref("courtyard", "2026-08-10", "2026-08");
    assert.match(href, /\/staff\/calendar\?/);
    assert.match(href, /month=2026-08/);
    assert.match(href, /room=courtyard/);
    assert.match(href, /date=2026-08-10/);
    assert.doesNotMatch(href, /unit=/);
    assert.doesNotMatch(href, /mode=/);
  });

  it("passes the door unit and opens the choice sheet when staff taps a door cell", () => {
    const href = getTimelineDayHref("courtyard", "2026-08-10", "2026-08", undefined, {
      unitId: "unit-116",
    });
    assert.match(href, /unit=unit-116/);
    assert.doesNotMatch(href, /mode=/);
  });
});
