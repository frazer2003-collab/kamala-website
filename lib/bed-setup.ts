export type BedSetup = "double" | "twin";

const ALL_BED_SETUPS: BedSetup[] = ["double", "twin"];

export function isBedSetup(value: string): value is BedSetup {
  return value === "double" || value === "twin";
}

export function parseBedSetup(value: string | null | undefined): BedSetup | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return isBedSetup(normalized) ? normalized : null;
}

export function getAllowedBedSetups(_roomId?: string): BedSetup[] {
  return ALL_BED_SETUPS;
}

export function roomOffersBedSetupChoice(_roomId?: string): boolean {
  return true;
}

/**
 * Resolve the bed setup to persist for a booking.
 * Every room accepts double or twin.
 */
export function resolveBedSetupForRoom(
  _roomId: string,
  requested: string | null | undefined,
): { bedSetup: BedSetup | null; error: string | null } {
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

export function defaultBedSetupForRoom(_roomId?: string): BedSetup {
  return "double";
}
