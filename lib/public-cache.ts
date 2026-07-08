import { revalidateTag } from "next/cache";

export const PUBLIC_CACHE_TAGS = {
  propertySettings: "property-settings",
  publicRooms: "public-rooms",
  publicPromotions: "public-promotions",
  propertyGallery: "property-gallery",
  publicTours: "public-tours",
} as const;

export type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];

export function revalidatePublicCache(...tags: PublicCacheTag[]) {
  const selected =
    tags.length > 0 ? tags : (Object.values(PUBLIC_CACHE_TAGS) as PublicCacheTag[]);

  for (const tag of selected) {
    revalidateTag(tag, "max");
  }
}
