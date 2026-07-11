type RoomEssentialsInput = {
  outlook: string;
  sleeps: string;
};

export function formatRoomEssentials(room: RoomEssentialsInput): string {
  const parts = room.outlook
    .split(/[·•\-–—]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const bedPart =
    parts.find((part) => /\b(bed|beds|twin|king|queen|single)\b/i.test(part)) ??
    parts[1] ??
    "";

  const guestCount = room.sleeps.match(/(\d+)/)?.[1];
  const sleepsLabel = guestCount ? `Sleeps ${guestCount}` : room.sleeps;

  if (bedPart && sleepsLabel) {
    return `${bedPart} · ${sleepsLabel}`;
  }

  return sleepsLabel || bedPart || room.outlook;
}
