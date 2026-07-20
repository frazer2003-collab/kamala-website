export const PUBLIC_CACHE_TAGS = {
  propertySettings: "property-settings",
  publicRooms: "public-rooms",
  publicPromotions: "public-promotions",
  propertyGallery: "property-gallery",
  publicTours: "public-tours",
} as const;

export type PublicCacheTag = (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];
