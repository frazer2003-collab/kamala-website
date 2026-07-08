export const MAX_ROOM_TYPES = 6;

export const ROOM_TONES = ["courtyard", "garden", "veranda", "attic"] as const;

export type RoomTone = (typeof ROOM_TONES)[number];

export function isRoomTone(value: string): value is RoomTone {
  return (ROOM_TONES as readonly string[]).includes(value);
}

export function createRoomId(shortName: string) {
  const base = shortName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "room"}-${suffix}`;
}
