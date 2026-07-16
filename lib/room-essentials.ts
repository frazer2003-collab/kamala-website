type RoomEssentialsInput = {
  outlook: string;
  sleeps: string;
};

const BED_PART_PATTERN = /\b(bed|beds|twin|king|queen|single)\b/i;

function splitOutlookParts(outlook: string) {
  return outlook
    .split(/[·•\-–—]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatRoomEssentials(room: RoomEssentialsInput): string {
  const parts = splitOutlookParts(room.outlook);

  const bedPart =
    parts.find((part) => BED_PART_PATTERN.test(part)) ?? parts[1] ?? "";

  const guestCount = room.sleeps.match(/(\d+)/)?.[1];
  const sleepsLabel = guestCount ? `Sleeps ${guestCount}` : room.sleeps;

  if (bedPart && sleepsLabel) {
    return `${bedPart} · ${sleepsLabel}`;
  }

  return sleepsLabel || bedPart || room.outlook;
}

/** Outlook facts that are not already covered by bed/sleep essentials. */
export function formatRoomOutlookDetails(room: RoomEssentialsInput): string {
  return splitOutlookParts(room.outlook)
    .filter((part) => !BED_PART_PATTERN.test(part))
    .join(" · ");
}
