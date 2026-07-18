/**
 * Canonical public site origin for absolute links (iCal export, emails, SEO).
 * Prefer NEXT_PUBLIC_APP_URL — the same var used across booking/Stripe setup.
 */
export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed.replace(/\/$/, "");
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getRoomIcalExportUrl(exportToken: string) {
  return `${getSiteUrl()}/api/ical/${encodeURIComponent(exportToken)}`;
}

/** Per room-number export for Airbnb listings. */
export function getRoomUnitIcalExportUrl(exportToken: string) {
  return `${getSiteUrl()}/api/ical/unit/${encodeURIComponent(exportToken)}`;
}
