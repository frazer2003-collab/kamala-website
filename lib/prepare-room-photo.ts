import {
  MAX_ROOM_PHOTO_BYTES,
  getRoomPhotoValidationError,
} from "@/lib/room-photo-shared";

export const ROOM_PHOTO_MAX_WIDTH = 1600;
export const ROOM_PHOTO_MAX_HEIGHT = 1200;
export const ROOM_PHOTO_OUTPUT_QUALITY = 0.88;
const SKIP_PREPARE_BELOW_BYTES = 350_000;

function getOutputName(file: File, extension: string) {
  const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "room-photo";
  return `${baseName}.${extension}`;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function encodePreparedPhoto(canvas: HTMLCanvasElement) {
  let quality = ROOM_PHOTO_OUTPUT_QUALITY;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const webpBlob = await canvasToBlob(canvas, "image/webp", quality);
    if (webpBlob && webpBlob.size <= MAX_ROOM_PHOTO_BYTES) {
      return { blob: webpBlob, type: "image/webp", extension: "webp" } as const;
    }

    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (jpegBlob && jpegBlob.size <= MAX_ROOM_PHOTO_BYTES) {
      return { blob: jpegBlob, type: "image/jpeg", extension: "jpg" } as const;
    }

    quality -= 0.06;
  }

  return null;
}

export async function prepareRoomPhotoFile(file: File) {
  const validationError = getRoomPhotoValidationError(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const bitmap = await createImageBitmap(file);
  const withinBounds =
    bitmap.width <= ROOM_PHOTO_MAX_WIDTH && bitmap.height <= ROOM_PHOTO_MAX_HEIGHT;
  const alreadyOptimized =
    withinBounds &&
    file.size <= SKIP_PREPARE_BELOW_BYTES &&
    (file.type === "image/webp" || file.type === "image/jpeg");

  if (alreadyOptimized) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(
    1,
    ROOM_PHOTO_MAX_WIDTH / bitmap.width,
    ROOM_PHOTO_MAX_HEIGHT / bitmap.height,
  );
  const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this photo.");
  }

  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const encoded = await encodePreparedPhoto(canvas);
  if (!encoded) {
    throw new Error("Photo is still too large after resizing. Try a smaller image.");
  }

  return new File([encoded.blob], getOutputName(file, encoded.extension), {
    type: encoded.type,
    lastModified: Date.now(),
  });
}
