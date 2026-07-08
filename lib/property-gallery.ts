import type { PropertyGalleryPhotoRow } from "@/lib/supabase";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
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

function mapPhoto(row: PropertyGalleryPhotoRow): PropertyGalleryPhoto {
  return {
    id: row.id,
    url: row.url,
    caption: row.caption,
    sortOrder: row.sort_order,
  };
}

export async function getPublicPropertyGalleryPhotos() {
  return getPublicPropertyGalleryPhotosCached();
}

const getPublicPropertyGalleryPhotosCached = cache(
  unstable_cache(fetchPublicPropertyGalleryPhotos, ["property-gallery"], {
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
      return [];
    }

    return data.map(mapPhoto);
  } catch {
    return [];
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
