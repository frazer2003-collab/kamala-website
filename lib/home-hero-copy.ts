function looksLikeStreetPart(part: string): boolean {
  return /^\d/.test(part) || /\b(soi|road|rd\.?|street|st\.?|lane|ave\.?)\b/i.test(part);
}

function looksLikeVenueName(part: string, propertyName: string): boolean {
  const lower = part.toLowerCase();
  const nameLower = propertyName.trim().toLowerCase();

  if (nameLower.length >= 4 && lower.includes(nameLower.slice(0, Math.min(10, nameLower.length)))) {
    return true;
  }

  return /\b(guest\s*house|guesthouse|boutique|hotel|resort|hostel|villa)\b/i.test(part);
}

export function getGuesthouseLocationLabel(
  addressLine: string | null,
  propertyName: string,
): string {
  if (!addressLine?.trim()) {
    return propertyName;
  }

  const parts = addressLine
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const geographic = parts.filter(
    (part) => !looksLikeStreetPart(part) && !looksLikeVenueName(part, propertyName),
  );

  if (geographic.length === 0) {
    return parts.slice(-2).join(", ") || propertyName;
  }

  const tail = geographic.slice(-2);
  if (
    tail.length === 2 &&
    /district$/i.test(tail[0]) &&
    !/district$/i.test(tail[1])
  ) {
    return tail[1].replace(/\s+\d{4,6}$/, "").trim() || tail[1];
  }

  return tail.join(", ") || propertyName;
}

/** True only for coastal geography — not when "Kamala" appears in the property name alone. */
export function isCoastalLocation(locationLabel: string): boolean {
  const lower = locationLabel.toLowerCase();

  if (lower.includes("phuket") || lower.includes("krabi") || lower.includes("beach")) {
    return true;
  }

  if (lower.includes("kamala") && lower.includes("phuket")) {
    return true;
  }

  return /\bkoh[\s-]?\w+/i.test(locationLabel);
}

export function isChiangMaiLocation(locationLabel: string): boolean {
  return locationLabel.toLowerCase().includes("chiang mai");
}

export function isNearThaPhaeGate(addressLine: string | null): boolean {
  return /tha\s*phae/i.test(addressLine ?? "");
}

export function buildAtmosphereHeadline(
  locationLabel: string,
  propertyName: string,
  addressLine: string | null = null,
): string {
  const place =
    locationLabel.toLowerCase() === propertyName.toLowerCase()
      ? propertyName
      : locationLabel;

  if (isCoastalLocation(locationLabel)) {
    return `Sleep under the palms in ${place}.`;
  }

  if (isChiangMaiLocation(locationLabel) && isNearThaPhaeGate(addressLine)) {
    return "A guesthouse near Tha Phae Gate, Chiang Mai.";
  }

  if (isChiangMaiLocation(locationLabel)) {
    return `Slow mornings in ${place}.`;
  }

  return `A calm stay in ${place}.`;
}

function isPropertyTypeTagline(tagline: string): boolean {
  return /\b(guest\s*house|guesthouse|boutique|hotel|hostel|resort|villa)\b/i.test(
    tagline,
  );
}

export function buildAtmosphereLede(
  locationLabel: string,
  propertyTagline: string,
  addressLine: string | null = null,
): string {
  const tagline = propertyTagline.trim();
  const typeLabel =
    tagline && isPropertyTypeTagline(tagline) ? tagline.toLowerCase() : "guesthouse";

  if (isCoastalLocation(locationLabel)) {
    return `A family-run ${typeLabel} in ${locationLabel}. Garden rooms, included breakfast, and an easy walk to the beach — book here and we reply to confirm.`;
  }

  if (isChiangMaiLocation(locationLabel)) {
    const gateNote = isNearThaPhaeGate(addressLine)
      ? "steps from Tha Phae Gate"
      : "in Chiang Mai Old City";
    return `A family-run ${typeLabel} ${gateNote}. Shaded garden rooms, included breakfast, and a short walk to temples and markets — book here and we reply to confirm.`;
  }

  return `A family-run ${typeLabel} in ${locationLabel}. Garden rooms, included breakfast — book here and we reply to confirm.`;
}

export function buildStayStoryHeading(
  locationLabel: string,
  addressLine: string | null = null,
): string {
  if (isChiangMaiLocation(locationLabel) && isNearThaPhaeGate(addressLine)) {
    return "A garden guesthouse near Tha Phae Gate";
  }

  if (isChiangMaiLocation(locationLabel)) {
    return "A garden guesthouse in Chiang Mai Old City";
  }

  return `A garden guesthouse in ${locationLabel}`;
}

export function buildStayStoryLede(
  propertyName: string,
  locationLabel: string,
  addressLine: string | null,
): string {
  const atmosphereLine = buildStayStoryAtmosphereLine(locationLabel);

  if (isChiangMaiLocation(locationLabel)) {
    const placeNote = isNearThaPhaeGate(addressLine)
      ? "one minute from Tha Phae Gate"
      : "in Chiang Mai Old City";
    return `${propertyName} is family-run — wooden rooms around a courtyard garden, ${placeNote}, not a resort block. ${atmosphereLine}`;
  }

  if (isCoastalLocation(locationLabel)) {
    return `${propertyName} is family-run — wooden rooms around a tropical garden in ${locationLabel}, not a resort block. ${atmosphereLine}`;
  }

  return `${propertyName} is family-run — wooden rooms around a garden in ${locationLabel}, not a resort block. ${atmosphereLine}`;
}

export function buildMetadataNearbyNote(
  locationLabel: string,
  addressLine: string | null,
): string {
  if (isCoastalLocation(locationLabel)) {
    return "Garden rooms a short walk from the beach.";
  }

  if (isChiangMaiLocation(locationLabel)) {
    return isNearThaPhaeGate(addressLine)
      ? "Near Tha Phae Gate and Chiang Mai Old City."
      : "In Chiang Mai Old City.";
  }

  return "Garden rooms in a quiet neighborhood.";
}

export function buildRoomsSectionSubhead(
  roomCount: number,
  addressLine: string | null = null,
): string {
  const types = roomCount === 1 ? "1 room type" : `${roomCount} room types`;

  if (addressLine && /chiang\s*mai/i.test(addressLine)) {
    const locationNote = isNearThaPhaeGate(addressLine)
      ? "near Tha Phae Gate"
      : "in Chiang Mai Old City";
    return `${types} ${locationNote} · breakfast included · book directly with us`;
  }

  return `${types} · breakfast included · you book directly with us`;
}

export function buildStayStoryAtmosphereLine(locationLabel: string): string {
  if (isCoastalLocation(locationLabel)) {
    return "Guests come for the quiet, the morning light through the palms, and staff who actually live nearby.";
  }

  if (isChiangMaiLocation(locationLabel)) {
    return "Guests come for the shady courtyard, the slower old-city rhythm, and staff who actually live nearby.";
  }

  return "Guests come for the quiet garden, unhurried mornings, and staff who actually live nearby.";
}
