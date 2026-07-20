import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stayAvailabilityMap, type RoomStayAvailability } from "./stay-availability";
import { parseStayDates } from "./stay-dates";
import { getPropertyTodayIso } from "./calendar";

describe("stayAvailabilityMap", () => {
  it("maps room ids to available counts", () => {
    const entries: RoomStayAvailability[] = [
      { roomId: "garden", totalRooms: 2, availableCount: 1 },
      { roomId: "loft", totalRooms: 1, availableCount: 0 },
    ];

    assert.equal(stayAvailabilityMap(entries).get("garden"), 1);
    assert.equal(stayAvailabilityMap(entries).get("loft"), 0);
  });
});

describe("parseStayDates", () => {
  it("rejects arrivals before the property timezone today", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const yesterdayDate = new Date(year, month - 1, day - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    assert.equal(parseStayDates(yesterday, today), null);
  });

  it("accepts arrivals on property timezone today", () => {
    const today = getPropertyTodayIso();
    const [year, month, day] = today.split("-").map(Number);
    const tomorrowDate = new Date(year, month - 1, day + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

    const parsed = parseStayDates(today, tomorrow);
    assert.ok(parsed);
    assert.equal(parsed?.arrival, today);
    assert.equal(parsed?.departure, tomorrow);
  });
});
