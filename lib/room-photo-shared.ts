/** Client-safe photo limits and validation (no Node built-ins). */

export const ROOM_PHOTO_BUCKET = "room-photos";
export const MAX_ROOM_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 8;

export const PROPERTY_GALLERY_BUCKET = "property-gallery";
export const MAX_PROPERTY_GALLERY_PHOTOS = 30;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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
