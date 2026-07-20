import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidIcalImportUrl } from "./room-ical";

describe("isValidIcalImportUrl", () => {
  it("accepts HTTPS Airbnb and Booking.com hosts", () => {
    assert.equal(
      isValidIcalImportUrl("https://www.airbnb.com/calendar/ical/123.ics"),
      true,
    );
    assert.equal(
      isValidIcalImportUrl("https://ical.booking.com/v1/export?t=abc"),
      true,
    );
  });

  it("rejects http, private hosts, and unknown domains", () => {
    assert.equal(isValidIcalImportUrl("http://www.airbnb.com/cal.ics"), false);
    assert.equal(isValidIcalImportUrl("https://127.0.0.1/cal.ics"), false);
    assert.equal(isValidIcalImportUrl("https://evil.example/cal.ics"), false);
  });
});
