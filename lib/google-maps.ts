export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export function buildGoogleMapsSearchUrl(address: string) {
  const query = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * OpenStreetMap embed (no API key). Google’s old `output=embed` URLs now 404.
 */
export function buildMapEmbedUrl(coordinates: MapCoordinates, span = 0.012) {
  const { latitude, longitude } = coordinates;
  const west = longitude - span;
  const south = latitude - span * 0.7;
  const east = longitude + span;
  const north = latitude + span * 0.7;
  const bbox = [west, south, east, north].map((value) => value.toFixed(5)).join("%2C");
  const marker = `${latitude.toFixed(5)}%2C${longitude.toFixed(5)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
}

/** @deprecated Prefer buildMapEmbedUrl with coordinates — Google output=embed is broken. */
export function buildGoogleMapsEmbedUrl(address: string) {
  const query = encodeURIComponent(address.trim());
  return `https://www.google.com/maps?q=${query}&z=15&output=embed`;
}
