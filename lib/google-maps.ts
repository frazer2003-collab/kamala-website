export function buildGoogleMapsSearchUrl(address: string) {
  const query = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildGoogleMapsEmbedUrl(address: string) {
  const query = encodeURIComponent(address.trim());
  return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
}
