export function isRoomBookable(availableCount: number) {
  return availableCount > 0;
}

export function getRoomAvailabilityLabel(availableCount: number) {
  if (availableCount <= 0) {
    return "Full";
  }

  if (availableCount === 1) {
    return "1 room available";
  }

  return `${availableCount} rooms available`;
}

export function formatRoomTypeAvailabilityCount(availableCount: number) {
  if (availableCount <= 0) {
    return "Full for these dates";
  }

  if (availableCount === 1) {
    return "1 room free";
  }

  return `${availableCount} rooms free`;
}
