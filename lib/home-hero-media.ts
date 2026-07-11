import { sanitizeMediaUrl } from "@/lib/media-url";

/** Bundled courtyard/garden photo when staff have not uploaded a hero. */
export const DEFAULT_HERO_IMAGE_URL = "/gallery/hero.jpg";

export function resolveHeroImageUrl(heroImageUrl: string | null | undefined): string | null {
  return sanitizeMediaUrl(heroImageUrl) ?? DEFAULT_HERO_IMAGE_URL;
}
