/**
 * Distinct soft bar colors for staff calendar stays.
 * Same guest name → same color; each new name takes an unused palette slot.
 */
export const BOOKING_BAR_PALETTE = [
  "#e8c4a8", // warm sand
  "#c5d4e8", // soft blue
  "#d4e0c8", // sage
  "#e8d0dc", // dusty rose
  "#d8d0e8", // lilac
  "#e8e0b8", // pale gold
  "#c8ddd8", // mist teal
  "#e8c8c0", // clay
  "#c8d8e0", // sky grey
  "#dce8c8", // chartreuse wash
  "#e0d0c8", // taupe
  "#c8e0e8", // ice
  "#e8d8c8", // biscuit
  "#d0c8e0", // periwinkle wash
  "#d8e8d8", // mint
  "#e8d0c8", // apricot
  "#d0dce8", // powder
  "#e0e0c8", // olive wash
  "#e8c8d0", // blush
  "#c8e0d4", // sea foam
  "#e0c8e0", // orchid wash
  "#d8d4c8", // stone
  "#c8d0e8", // cornflower wash
  "#e0d8d0", // linen
] as const;

export function normalizeGuestColorKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Assign a unique palette color per guest name (case-insensitive).
 * Each name prefers a hash-derived slot, then probes for the next unused color
 * so colors feel random, stay stable for a name, and avoid reuse until wrap.
 */
export function assignGuestBarColors(guestNames: string[]): Map<string, string> {
  const uniqueKeys = [
    ...new Set(
      guestNames
        .map(normalizeGuestColorKey)
        .filter((name) => name.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const colors = new Map<string, string>();
  const usedIndexes = new Set<number>();
  const paletteSize = BOOKING_BAR_PALETTE.length;

  uniqueKeys.forEach((key, orderIndex) => {
    if (usedIndexes.size >= paletteSize) {
      usedIndexes.clear();
    }

    let index = hashString(key) % paletteSize;
    let attempts = 0;
    while (usedIndexes.has(index) && attempts < paletteSize) {
      index = (index + 1) % paletteSize;
      attempts += 1;
    }

    // If the palette somehow still collides, fall back to order.
    if (usedIndexes.has(index)) {
      index = orderIndex % paletteSize;
    }

    usedIndexes.add(index);
    colors.set(key, BOOKING_BAR_PALETTE[index]!);
  });

  return colors;
}

export function guestBarColorForName(
  guestName: string,
  colors: Map<string, string>,
  fallback = BOOKING_BAR_PALETTE[0],
) {
  const key = normalizeGuestColorKey(guestName);
  if (!key) {
    return fallback;
  }
  return colors.get(key) ?? fallback;
}
