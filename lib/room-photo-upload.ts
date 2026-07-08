import { randomUUID } from "node:crypto";
import { createStaffSupabaseClient } from "@/lib/supabase";

export const ROOM_PHOTO_BUCKET = "room-photos";
export const MAX_ROOM_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 8;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getFileExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export function getRoomPhotoValidationError(file: File) {
  if (file.size <= 0) {
    return null;
  }

  if (!allowedMimeTypes.has(file.type)) {
    return "Photos must be JPEG, PNG, WebP, or GIF.";
  }

  if (file.size > MAX_ROOM_PHOTO_BYTES) {
    return "Each photo must be 4 MB or smaller.";
  }

  return null;
}

export async function uploadRoomPhoto(roomId: string, file: File) {
  const validationError = getRoomPhotoValidationError(file);
  if (validationError) {
    return { error: validationError } as const;
  }

  const supabase = createStaffSupabaseClient();
  const path = `${roomId}/${randomUUID()}.${getFileExtension(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(ROOM_PHOTO_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    if (error.message.toLowerCase().includes("bucket")) {
      return {
        error: "Photo storage is not set up yet. Run supabase/migrate-room-photo-storage.sql in Supabase.",
      } as const;
    }

    return { error: "Could not upload this photo. Try again." } as const;
  }

  const { data } = supabase.storage.from(ROOM_PHOTO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl } as const;
}

export function resolveRoomPhotosFromForm(formData: FormData) {
  return {
    imageUrl: getFormValue(formData, "image-url") || null,
    galleryUrls: parseGalleryUrls(getFormValue(formData, "gallery-urls")),
  };
}

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseGalleryUrls(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
