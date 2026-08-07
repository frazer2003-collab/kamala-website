/**
 * Canonical public site origin for absolute links (iCal export, emails, SEO).
 * Prefer NEXT_PUBLIC_APP_URL — the same var used across booking/Stripe setup.
 */

/** Live guest site — apex has no DNS; www is the Vercel hostname. */
export const PRODUCTION_SITE_ORIGIN = "https://www.kamalaguesthouse.com";

/**
 * Normalize a configured origin so email/chat links resolve.
 * Apex kamalaguesthouse.com has no A/AAAA records (DNS_PROBE_POSSIBLE);
 * rewrite to www so "Open conversation" in guest email works.
 */
export function normalizeSiteUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (
      parsed.hostname === "kamalaguesthouse.com" ||
      parsed.hostname === "www.kamalaguesthouse.com"
    ) {
      parsed.protocol = "https:";
      parsed.hostname = "www.kamalaguesthouse.com";
    }
    return parsed.origin;
  } catch {
    return trimmed;
  }
}

export function getSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return normalizeSiteUrl(trimmed);
    }
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeSiteUrl(`https://${vercel.replace(/\/$/, "")}`);
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
