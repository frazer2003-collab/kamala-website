import type { Room } from "@/lib/content";
import {
  getPublicPropertyGalleryPhotos,
  samplePropertyGalleryPhotos,
  type PropertyGalleryPhoto,
} from "@/lib/property-gallery";
import { getPublicRooms } from "@/lib/rooms";

export type GuestGallerySection = {
  id: "rooms" | "property";
  title: string;
  description: string;
  photos: PropertyGalleryPhoto[];
};

function uniqueUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push(url);
  }

  return result;
}

/** Room cover + gallery shots, in room sort order. */
export function collectRoomGalleryPhotos(rooms: Room[]): PropertyGalleryPhoto[] {
  const photos: PropertyGalleryPhoto[] = [];

  for (const room of rooms) {
    const urls = uniqueUrls([room.imageUrl, ...room.galleryUrls]);

    urls.forEach((url, index) => {
      photos.push({
        id: `room-${room.id}-${index}`,
        url,
        caption: urls.length > 1 ? `${room.name} · ${index + 1}` : room.name,
        sortOrder: photos.length,
      });
    });
  }

  return photos;
}

export async function getGuestGallerySections(): Promise<GuestGallerySection[]> {
  const [rooms, propertyPhotos] = await Promise.all([
    getPublicRooms(),
    getPublicPropertyGalleryPhotos(),
  ]);

  const roomPhotos = collectRoomGalleryPhotos(rooms);
  const sections: GuestGallerySection[] = [];

  if (roomPhotos.length > 0) {
    sections.push({
      id: "rooms",
      title: "Rooms",
      description: "A look inside each room type.",
      photos: roomPhotos,
    });
  }

  if (propertyPhotos.length > 0) {
    sections.push({
      id: "property",
      title: "Around the guesthouse",
      description: "Common areas, garden, and the neighborhood feel.",
      photos: propertyPhotos,
    });
  }

  if (sections.length === 0) {
    sections.push({
      id: "property",
      title: "Around the guesthouse",
      description: "Photos of the guesthouse, garden, and common areas.",
      photos: samplePropertyGalleryPhotos,
    });
  }

  return sections;
}
