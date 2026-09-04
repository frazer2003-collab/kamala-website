import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Room } from "@/lib/content";
import { computeGuestNightAvailability } from "./guest-night-availability-core";
import {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  clampGuestNightAvailabilityQuery,
  countInclusiveIsoDays,
  guestNightAvailabilityLatestIso,
} from "./guest-night-availability-shared";
import { addIsoDays, eachIsoDayInclusive } from "./room-day-inventory";

function room(overrides: Partial<Room> & Pick<Room, "id">): Room {
  return {
    name: overrides.id,
    shortName: overrides.id,
    rate: 700,
    sleeps: "2",
    outlook: "Garden",
    availableCount: 1,
    summary: "",
    amenities: [],
    tone: "garden",
    imageUrl: null,
    galleryUrls: [],
    ...overrides,
  };
}

describe("computeGuestNightAvailability", () => {
  it("marks nights open when any room type has inventory", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-06",
      bookings: [],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "open");
    assert.equal(nights["2026-09-06"], "open");
  });

  it("marks a night full when staff-closed and no other type is open", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "garden", startDate: "2026-09-05", endDate: "2026-09-06" },
      ],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "full");
  });

  it("stays open if another room type is free on a closed night", () => {
    const nights = computeGuestNightAvailability({
      rooms: [
        room({ id: "garden", availableCount: 1 }),
        room({ id: "courtyard", availableCount: 2 }),
      ],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [],
      channelBlocks: [],
      staffClosures: [
        { roomId: "garden", startDate: "2026-09-05", endDate: "2026-09-06" },
      ],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "open");
  });

  it("marks sold-out nights full from allotment", () => {
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso: "2026-09-05",
      toIso: "2026-09-05",
      bookings: [
        {
          roomId: "garden",
          roomUnitId: null,
          arrivalDate: "2026-09-05",
          departureDate: "2026-09-06",
          databaseId: "b1",
          guest: "Ada",
        },
      ],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: [],
    });

    assert.equal(nights["2026-09-05"], "full");
  });

  it("computes open/full across a full ~3-month horizon without dropping nights", () => {
    const fromIso = "2026-09-05";
    const toIso = addIsoDays(fromIso, GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
    assert.equal(countInclusiveIsoDays(fromIso, toIso), GUEST_NIGHT_AVAILABILITY_MAX_DAYS);

    const fullNight = "2026-10-01";
    const nights = computeGuestNightAvailability({
      rooms: [room({ id: "garden", availableCount: 1 })],
      fromIso,
      toIso,
      bookings: [
        {
          roomId: "garden",
          roomUnitId: null,
          arrivalDate: fullNight,
          departureDate: addIsoDays(fullNight, 1),
          databaseId: "b-full",
          guest: "Booked",
        },
      ],
      channelBlocks: [],
      staffClosures: [],
      inventoryLookup: new Map(),
      units: [],
    });

    const expectedDays = eachIsoDayInclusive(fromIso, toIso);
    assert.equal(Object.keys(nights).length, expectedDays.length);
    assert.equal(nights[fullNight], "full");
    assert.equal(nights[fromIso], "open");
    assert.equal(nights[toIso], "open");
  });
});

describe("guest night availability horizon (~3 months)", () => {
  it("exposes a 92-day inclusive public checking window", () => {
    assert.equal(GUEST_NIGHT_AVAILABILITY_MAX_DAYS, 92);
  });

  it("ends the horizon MAX_DAYS inclusive from today", () => {
    assert.equal(guestNightAvailabilityLatestIso("2026-09-05"), "2026-12-05");
    assert.equal(
      countInclusiveIsoDays("2026-09-05", "2026-12-05"),
      GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
    );
  });

  it("clamps from up to today and keeps a valid window", () => {
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw: "2026-08-01",
      toRaw: "2026-09-20",
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, {
      ok: true,
      fromIso: "2026-09-05",
      toIso: "2026-09-20",
    });
  });

  it("rejects a single request longer than the max span", () => {
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw: "2026-09-05",
      toRaw: addIsoDays("2026-09-05", GUEST_NIGHT_AVAILABILITY_MAX_DAYS),
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, { ok: false, reason: "too-long" });
  });

  it("allows exactly MAX_DAYS inclusive", () => {
    const toIso = addIsoDays("2026-09-05", GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw: "2026-09-05",
      toRaw: toIso,
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, {
      ok: true,
      fromIso: "2026-09-05",
      toIso,
    });
  });

  it("rejects when the raw span exceeds max even if part is past the horizon", () => {
    const latest = guestNightAvailabilityLatestIso("2026-09-05");
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw: "2026-09-05",
      toRaw: addIsoDays(latest, 14),
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, { ok: false, reason: "too-long" });
  });

  it("truncates to the horizon when to overshoots but the span stays within max", () => {
    const todayIso = "2026-09-05";
    const latest = guestNightAvailabilityLatestIso(todayIso);
    const fromRaw = addIsoDays(latest, -10);
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw,
      toRaw: addIsoDays(latest, 20),
      todayIso,
    });
    assert.deepEqual(clamped, {
      ok: true,
      fromIso: fromRaw,
      toIso: latest,
    });
  });
  it("stops checking entirely when from is beyond the horizon", () => {
    const latest = guestNightAvailabilityLatestIso("2026-09-05");
    const fromRaw = addIsoDays(latest, 1);
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw,
      toRaw: addIsoDays(fromRaw, 10),
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, { ok: false, reason: "beyond-horizon" });
  });

  it("rejects inverted ranges", () => {
    const clamped = clampGuestNightAvailabilityQuery({
      fromRaw: "2026-09-20",
      toRaw: "2026-09-10",
      todayIso: "2026-09-05",
    });
    assert.deepEqual(clamped, { ok: false, reason: "inverted" });
  });
});
