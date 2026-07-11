import { randomUUID } from "node:crypto";
import { createStaffSupabaseClient } from "@/lib/supabase";
import {
  MAX_PROPERTY_GALLERY_PHOTOS,
  PROPERTY_GALLERY_BUCKET,
  getRoomPhotoValidationError,
} from "@/lib/room-photo-shared";

export { MAX_PROPERTY_GALLERY_PHOTOS, PROPERTY_GALLERY_BUCKET };

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

export async function uploadPropertyGalleryPhoto(file: File) {
  const validationError = getRoomPhotoValidationError(file);
  if (validationError) {
    return { error: validationError } as const;
  }

  const supabase = createStaffSupabaseClient();
  const storagePath = `${randomUUID()}.${getFileExtension(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(PROPERTY_GALLERY_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    if (error.message.toLowerCase().includes("bucket")) {
      return {
        error:
          "Gallery storage is not set up yet. Run supabase/migrate-property-gallery.sql in Supabase.",
      } as const;
    }

    return { error: "Could not upload this photo. Try again." } as const;
  }

  const { data } = supabase.storage.from(PROPERTY_GALLERY_BUCKET).getPublicUrl(storagePath);
  return { url: data.publicUrl, storagePath } as const;
}

export async function deletePropertyGalleryStorageObject(storagePath: string) {
  const supabase = createStaffSupabaseClient();
  const { error } = await supabase.storage.from(PROPERTY_GALLERY_BUCKET).remove([storagePath]);

  if (error) {
    return { error: "Could not remove this photo from storage." } as const;
  }

  return { success: true } as const;
}
