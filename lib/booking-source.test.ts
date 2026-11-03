import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBookingSource,
  inferBookingSourceFromChannelLabel,
  isBookingSource,
  isOtaBookingSource,
  parseBookingSource,
} from "./booking-source";

describe("booking source", () => {
  it("accepts the staff source values including website", () => {
    assert.equal(isBookingSource("website"), true);
    assert.equal(isBookingSource("walk-in"), true);
    assert.equal(isBookingSource("airbnb"), true);
    assert.equal(isBookingSource("expedia"), true);
    assert.equal(isBookingSource("booking"), true);
    assert.equal(isBookingSource("manual"), false);
  });

  it("parses and formats labels", () => {
    assert.equal(parseBookingSource(" Website "), "website");
    assert.equal(parseBookingSource(" Booking "), "booking");
    assert.equal(parseBookingSource("unknown"), null);
    assert.equal(formatBookingSource("website"), "Website");
    assert.equal(formatBookingSource("booking"), "Booking.com");
    assert.equal(formatBookingSource(null), "—");
  });

  it("does not treat website as an OTA channel source", () => {
    assert.equal(isOtaBookingSource("website"), false);
  });

  it("infers source from channel feed labels", () => {
    assert.equal(inferBookingSourceFromChannelLabel("Airbnb Superior"), "airbnb");
    assert.equal(inferBookingSourceFromChannelLabel("Booking.com"), "booking");
    assert.equal(inferBookingSourceFromChannelLabel("Expedia feed"), "expedia");
    assert.equal(inferBookingSourceFromChannelLabel("Manual block"), null);
  });

  it("detects OTA booking sources", () => {
    assert.equal(isOtaBookingSource("airbnb"), true);
    assert.equal(isOtaBookingSource("walk-in"), false);
    assert.equal(isOtaBookingSource(null), false);
  });
});
