import { sampleTours, type Tour } from "@/lib/content";
import { sanitizeMediaUrl, sanitizeMediaUrlList } from "@/lib/media-url";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createGuestSupabaseClient,
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type TourRow,
} from "@/lib/supabase";

export type StaffTour = Tour & {
  imageStoragePath: string | null;
  createdAt: string;
};

/** Bundled covers for known Chiang Mai seed titles when DB image_url is empty. */
const bundledTourCoverByTitle = new Map(
  sampleTours
    .filter((tour) => tour.imageUrl)
    .map((tour) => [tour.title, tour.imageUrl as string]),
);

function resolveTourImageUrl(imageUrl: string | null | undefined, title: string): string | null {
  return sanitizeMediaUrl(imageUrl) ?? bundledTourCoverByTitle.get(title) ?? null;
}

function mapTourRow(row: TourRow): Tour {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    durationLabel: row.duration_label,
    priceLabel: row.price_label,
    imageUrl: resolveTourImageUrl(row.image_url, row.title),
    galleryUrls: sanitizeMediaUrlList(row.gallery_urls),
    linkUrl: row.link_url,
    linkLabel: row.link_label,
    sortOrder: row.sort_order,
  };
}

function mapStaffTourRow(row: TourRow): StaffTour {
  return {
    ...mapTourRow(row),
    imageStoragePath: row.image_storage_path,
    createdAt: row.created_at,
  };
}

export async function getPublicTours(): Promise<Tour[]> {
  return getPublicToursCached();
}

const getPublicToursCached = cache(
  unstable_cache(fetchPublicTours, ["public-tours-v2"], {
    revalidate: 120,
    tags: [PUBLIC_CACHE_TAGS.publicTours],
  }),
);

async function fetchPublicTours(): Promise<Tour[]> {
  try {
    const supabase = createGuestSupabaseClient();
    const { data, error } = await supabase
      .from("tours")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return sampleTours;
    }

    return data.map(mapTourRow);
  } catch {
    return sampleTours;
  }
}

export async function getStaffTours(): Promise<StaffTour[]> {
  if (!hasStaffSupabaseConfig()) {
    return sampleTours.map((tour, index) => ({
      ...tour,
      galleryUrls: tour.galleryUrls ?? [],
      imageStoragePath: null,
      createdAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    }));
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(mapStaffTourRow);
}

export async function getTourCount() {
  if (!hasStaffSupabaseConfig()) {
    return sampleTours.length;
  }

  const supabase = createStaffSupabaseClient();
  const { count, error } = await supabase.from("tours").select("id", { count: "exact", head: true });

  if (error || count === null) {
    return 0;
  }

  return count;
}

export async function getNextTourSortOrder() {
  const supabase = createStaffSupabaseClient();
  const { data } = await supabase
    .from("tours")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? -1) + 1;
}
