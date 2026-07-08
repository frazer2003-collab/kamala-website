export function getSiteUrl() {
  const explicit = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`;
  }

  return "http://localhost:3000";
}

export function getRoomIcalExportUrl(exportToken: string) {
  return `${getSiteUrl()}/api/ical/${exportToken}`;
}
