export type BedSetup = "double" | "twin";

const ALL_BED_SETUPS: BedSetup[] = ["double", "twin"];

/** Superior Double or Twin Room — the only type with a guest bed choice. */
const BED_SETUP_CHOICE_ROOM_IDS = new Set(["courtyard"]);

export function isBedSetup(value: string): value is BedSetup {
  return value === "double" || value === "twin";
}

export function parseBedSetup(value: string | null | undefined): BedSetup | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return isBedSetup(normalized) ? normalized : null;
}

export function roomOffersBedSetupChoice(roomId?: string): boolean {
  return Boolean(roomId && BED_SETUP_CHOICE_ROOM_IDS.has(roomId));
}

export function getAllowedBedSetups(roomId?: string): BedSetup[] {
  return roomOffersBedSetupChoice(roomId) ? ALL_BED_SETUPS : [];
}

/**
 * Resolve the bed setup to persist for a booking.
 * Only Superior (courtyard) requires / stores double or twin; other rooms stay null.
 */
export function resolveBedSetupForRoom(
  roomId: string,
  requested: string | null | undefined,
): { bedSetup: BedSetup | null; error: string | null } {
  if (!roomOffersBedSetupChoice(roomId)) {
    return { bedSetup: null, error: null };
  }

  const parsed = parseBedSetup(requested);
  if (!parsed) {
    return {
      bedSetup: null,
      error: "Choose one double bed or two single beds.",
    };
  }

  return { bedSetup: parsed, error: null };
}

export function formatBedSetup(setup: BedSetup): string {
  return setup === "twin" ? "Two single beds" : "One double bed";
}

export function formatBedSetupShort(setup: BedSetup): string {
  return setup === "twin" ? "Twin" : "Double";
}

export function defaultBedSetupForRoom(roomId?: string): BedSetup | "" {
  return roomOffersBedSetupChoice(roomId) ? "double" : "";
}
