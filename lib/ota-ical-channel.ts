/** Staff calendar import channels (OTA → Kamala). Safe for client imports. */

export type OtaIcalChannel = "airbnb" | "booking" | "expedia";

export type RoomIcalFeed = {
  id: string;
  roomId: string;
  roomUnitId: string | null;
  label: string;
  importUrl: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export function otaChannelFromLabel(label: string): OtaIcalChannel | null {
  const normalized = label.trim().toLowerCase();
  if (normalized.startsWith("airbnb")) {
    return "airbnb";
  }
  if (normalized.startsWith("booking")) {
    return "booking";
  }
  if (normalized.startsWith("expedia")) {
    return "expedia";
  }
  return null;
}

export function feedMatchesOtaChannel(feed: RoomIcalFeed, channel: OtaIcalChannel) {
  const fromLabel = otaChannelFromLabel(feed.label);
  if (fromLabel) {
    return fromLabel === channel;
  }
  // Legacy unit feeds without a channel prefix were Airbnb door imports.
  return channel === "airbnb" && Boolean(feed.roomUnitId);
}

export function otaChannelLabel(channel: OtaIcalChannel) {
  switch (channel) {
    case "airbnb":
      return "Airbnb";
    case "booking":
      return "Booking.com";
    case "expedia":
      return "Expedia";
  }
}
