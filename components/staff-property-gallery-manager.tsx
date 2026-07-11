"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  removePropertyGalleryPhoto,
  type StaffGalleryState,
} from "@/app/staff/auth-actions";
import type { PropertyGalleryPhoto } from "@/lib/property-gallery";
import { prepareRoomPhotoFile } from "@/lib/prepare-room-photo";
import { MAX_PROPERTY_GALLERY_PHOTOS } from "@/lib/room-photo-shared";

type StaffPropertyGalleryManagerProps = {
  initialPhotos: PropertyGalleryPhoto[];
  disabled: boolean;
};

const initialState: StaffGalleryState = {};

async function uploadGalleryPhoto(file: File) {
  const formData = new FormData();
  formData.set("photo", file);

  const response = await fetch("/api/staff/property-gallery", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as PropertyGalleryPhoto & { error?: string };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error ?? "Could not upload this photo.");
  }

  return payload;
}

export function StaffPropertyGalleryManager({
  initialPhotos,
  disabled,
}: StaffPropertyGalleryManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [state, removeAction, removing] = useActionState(removePropertyGalleryPhoto, initialState);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled || isUploading) {
      return;
    }

    const remainingSlots = MAX_PROPERTY_GALLERY_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can add up to ${MAX_PROPERTY_GALLERY_PHOTOS} gallery photos.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setUploadError(null);
    setIsUploading(true);

    try {
      const uploaded: PropertyGalleryPhoto[] = [];

      for (const file of files) {
        const prepared = await prepareRoomPhotoFile(file);
        uploaded.push(await uploadGalleryPhoto(prepared));
      }

      setPhotos((current) => [...current, ...uploaded]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload photos.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="staff-gallery-manager">
      <div className="staff-gallery-manager__toolbar">
        <div>
          <p className="staff-gallery-manager__count">
            {photos.length} of {MAX_PROPERTY_GALLERY_PHOTOS} photos
          </p>
          <p className="staff-gallery-manager__hint">
            JPEG, PNG, WebP, or GIF · up to 4 MB each. Photos are resized before upload.
          </p>
        </div>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || isUploading || photos.length >= MAX_PROPERTY_GALLERY_PHOTOS}
          id="staff-gallery-upload"
          multiple
          onChange={(event) => void handleUpload(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <label
          className={`button button--primary${disabled || isUploading || photos.length >= MAX_PROPERTY_GALLERY_PHOTOS ? " button--disabled" : ""}`}
          htmlFor="staff-gallery-upload"
        >
          {isUploading ? "Uploading..." : "Add photos"}
        </label>
      </div>

      {isUploading ? (
        <p className="staff-gallery-manager__status" role="status">
          Uploading photos...
        </p>
      ) : null}
      {uploadError ? (
        <p className="form-message form-message--error" role="alert">
          {uploadError}
        </p>
      ) : null}
      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message form-message--success" role="status">
          {state.success}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <ul className="staff-gallery-manager__grid">
          {photos.map((photo) => (
            <li key={photo.id}>
              <img alt="" className="staff-gallery-manager__thumb" src={photo.url} />
              <form action={removeAction} className="staff-gallery-manager__remove-form">
                <input name="photo-id" type="hidden" value={photo.id} />
                <button
                  className="button button--quiet staff-gallery-manager__remove"
                  disabled={disabled || removing}
                  type="submit"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="staff-empty-state staff-gallery-manager__empty">
          <h3>No gallery photos yet</h3>
          <p>Add photos of the guesthouse, garden, common areas, and views.</p>
        </div>
      )}
    </div>
  );
}
