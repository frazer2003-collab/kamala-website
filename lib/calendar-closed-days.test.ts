import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStaffTimelineDays } from "./calendar";
import {
  buildStaffClosedDayKeys,
  isUnitDayStaffClosed,
} from "./calendar-timeline";

describe("buildStaffClosedDayKeys", () => {
  const days = buildStaffTimelineDays("2026-08-01", "2026-08-05");

  it("marks nights covered by a staff type closure", () => {
    const keys = buildStaffClosedDayKeys({
      staffClosures: [
        {
          roomId: "ground",
          startDate: "2026-08-02",
          endDate: "2026-08-04",
        },
      ],
      calendarDays: days,
    });

    assert.equal(keys.has("ground:2026-08-01"), false);
    assert.equal(keys.has("ground:2026-08-02"), true);
    assert.equal(keys.has("ground:2026-08-03"), true);
    assert.equal(keys.has("ground:2026-08-04"), false);
  });

  it("does not mark other room types", () => {
    const keys = buildStaffClosedDayKeys({
      staffClosures: [
        {
          roomId: "ground",
          startDate: "2026-08-02",
          endDate: "2026-08-03",
        },
      ],
      calendarDays: days,
    });

    assert.equal(keys.has("loft:2026-08-02"), false);
  });
});

describe("isUnitDayStaffClosed", () => {
  it("is true when any linked room type is closed that night", () => {
    const closed = new Set(["ground:2026-08-02"]);
    assert.equal(
      isUnitDayStaffClosed({ roomIds: ["ground"] }, "2026-08-02", closed),
      true,
    );
    assert.equal(
      isUnitDayStaffClosed({ roomIds: ["loft", "ground"] }, "2026-08-02", closed),
      true,
    );
    assert.equal(
      isUnitDayStaffClosed({ roomIds: ["loft"] }, "2026-08-02", closed),
      false,
    );
  });
});
