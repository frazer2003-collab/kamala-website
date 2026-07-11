import { sanitizeMediaUrl } from "@/lib/media-url";

/** No remote default — staff upload or garden fallback atmosphere. */
export const DEFAULT_HERO_IMAGE_URL: string | null = null;

export function resolveHeroImageUrl(heroImageUrl: string | null | undefined): string | null {
  return sanitizeMediaUrl(heroImageUrl) ?? DEFAULT_HERO_IMAGE_URL;
}
