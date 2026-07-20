import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeBusyNightsToEvents } from "./room-ical";

describe("mergeBusyNightsToEvents", () => {
  it("merges contiguous nights into one DTEND-exclusive event", () => {
    const events = mergeBusyNightsToEvents(
      ["2026-08-01", "2026-08-02", "2026-08-03"],
      "uid",
      "Unavailable",
    );
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
      uid: "uid-2026-08-01",
      summary: "Unavailable",
      startDate: "2026-08-01",
      endDate: "2026-08-04",
    });
  });

  it("keeps gaps as separate events", () => {
    const events = mergeBusyNightsToEvents(
      ["2026-08-01", "2026-08-03"],
      "uid",
      "Unavailable",
    );
    assert.equal(events.length, 2);
    assert.equal(events[0].endDate, "2026-08-02");
    assert.equal(events[1].startDate, "2026-08-03");
    assert.equal(events[1].endDate, "2026-08-04");
  });
});
