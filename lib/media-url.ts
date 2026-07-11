/** Remote hosts that no longer resolve or should not be fetched by Next Image. */
const DEAD_IMAGE_HOSTS = new Set(["i.travelapi.com"]);

export function sanitizeMediaUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const { hostname, protocol } = new URL(trimmed);
    if (protocol !== "http:" && protocol !== "https:") {
      return trimmed.startsWith("/") ? trimmed : null;
    }
    if (DEAD_IMAGE_HOSTS.has(hostname) || DEAD_IMAGE_HOSTS.has(hostname.replace(/^www\./, ""))) {
      return null;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith("/") ? trimmed : null;
  }
}

export function sanitizeMediaUrlList(urls: string[] | null | undefined): string[] {
  if (!urls?.length) {
    return [];
  }

  return urls
    .map((url) => sanitizeMediaUrl(url))
    .filter((url): url is string => Boolean(url));
}
