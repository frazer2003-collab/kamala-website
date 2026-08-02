import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPropertyTodayIso } from "./calendar";
import { addIsoDays } from "./room-day-inventory";
import {
  getDefaultStayDates,
  resolveHomeStayDates,
} from "./stay-dates";

describe("getDefaultStayDates", () => {
  it("defaults to a one-night stay starting property-today", () => {
    const today = getPropertyTodayIso();
    const defaults = getDefaultStayDates();
    assert.equal(defaults.arrival, today);
    assert.equal(defaults.nights, 1);
    assert.equal(defaults.departure, addIsoDays(today, 1));
  });
});

describe("resolveHomeStayDates", () => {
  it("uses tonight when the guest has not selected dates", () => {
    const resolved = resolveHomeStayDates();
    assert.equal(resolved.usedDefault, true);
    assert.equal(resolved.dateError, false);
    assert.deepEqual(resolved.stayDates, getDefaultStayDates());
  });

  it("keeps an explicit valid stay and does not mark it as default", () => {
    const stay = getDefaultStayDates();
    const resolved = resolveHomeStayDates(stay.arrival, stay.departure);
    assert.equal(resolved.usedDefault, false);
    assert.equal(resolved.dateError, false);
    assert.deepEqual(resolved.stayDates, stay);
  });

  it("reports a date error for incomplete selections instead of defaulting", () => {
    const today = getPropertyTodayIso();
    const resolved = resolveHomeStayDates(today, undefined);
    assert.equal(resolved.usedDefault, false);
    assert.equal(resolved.dateError, true);
    assert.equal(resolved.stayDates, null);
  });
});
