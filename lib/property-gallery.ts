import type { PropertyGalleryPhotoRow } from "@/lib/supabase";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { sanitizeMediaUrl } from "@/lib/media-url";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createGuestSupabaseClient,
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
} from "@/lib/supabase";

export type PropertyGalleryPhoto = {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
};

/** Bundled property photos when the Supabase gallery is empty. */
export const samplePropertyGalleryPhotos: PropertyGalleryPhoto[] = [
  { id: "local-gallery-01", url: "/gallery/gallery-01.jpg", caption: null, sortOrder: 0 },
  { id: "local-gallery-02", url: "/gallery/gallery-02.jpg", caption: null, sortOrder: 1 },
  { id: "local-gallery-03", url: "/gallery/gallery-03.jpg", caption: null, sortOrder: 2 },
  { id: "local-gallery-04", url: "/gallery/gallery-04.jpg", caption: null, sortOrder: 3 },
  { id: "local-gallery-05", url: "/gallery/gallery-05.jpg", caption: null, sortOrder: 4 },
  { id: "local-gallery-06", url: "/gallery/gallery-06.jpg", caption: null, sortOrder: 5 },
  { id: "local-gallery-07", url: "/gallery/gallery-07.jpg", caption: null, sortOrder: 6 },
  { id: "local-gallery-08", url: "/gallery/gallery-08.jpg", caption: null, sortOrder: 7 },
  { id: "local-gallery-09", url: "/gallery/gallery-09.jpg", caption: null, sortOrder: 8 },
  { id: "local-gallery-10", url: "/gallery/gallery-10.jpg", caption: null, sortOrder: 9 },
  { id: "local-gallery-11", url: "/gallery/gallery-11.jpg", caption: null, sortOrder: 10 },
  { id: "local-gallery-garden", url: "/gallery/garden-01.jpg", caption: null, sortOrder: 11 },
];

function mapPhoto(row: PropertyGalleryPhotoRow): PropertyGalleryPhoto | null {
  const url = sanitizeMediaUrl(row.url);
  if (!url) {
    return null;
  }

  return {
    id: row.id,
    url,
    caption: row.caption,
    sortOrder: row.sort_order,
  };
}

function withGalleryFallback(photos: PropertyGalleryPhoto[]) {
  return photos.length > 0 ? photos : samplePropertyGalleryPhotos;
}

export async function getPublicPropertyGalleryPhotos() {
  return getPublicPropertyGalleryPhotosCached();
}

const getPublicPropertyGalleryPhotosCached = cache(
  unstable_cache(fetchPublicPropertyGalleryPhotos, ["property-gallery-v2"], {
    revalidate: 120,
    tags: [PUBLIC_CACHE_TAGS.propertyGallery],
  }),
);

async function fetchPublicPropertyGalleryPhotos() {
  try {
    const supabase = createGuestSupabaseClient();
    const { data, error } = await supabase
      .from("property_gallery_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) {
      return samplePropertyGalleryPhotos;
    }

    return withGalleryFallback(data.map(mapPhoto).filter((photo): photo is PropertyGalleryPhoto => Boolean(photo)));
  } catch {
    return samplePropertyGalleryPhotos;
  }
}

export async function getStaffPropertyGalleryPhotos() {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("property_gallery_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(mapPhoto);
  } catch {
    return [];
  }
}

export async function getPropertyGalleryPhotoCount() {
  if (!hasStaffSupabaseConfig()) {
    return 0;
  }

  const supabase = createStaffSupabaseClient();
  const { count, error } = await supabase
    .from("property_gallery_photos")
    .select("id", { count: "exact", head: true });

  if (error || count === null) {
    return 0;
  }

  return count;
}

export async function getNextPropertyGallerySortOrder() {
  const supabase = createStaffSupabaseClient();
  const { data } = await supabase
    .from("property_gallery_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}
