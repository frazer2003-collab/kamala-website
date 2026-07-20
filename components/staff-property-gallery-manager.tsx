"use client";
import { StaffBusyEffect, StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  movePropertyGalleryPhoto,
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

function guestLayoutClass(index: number, total: number) {
  if (total === 1) {
    return "staff-gallery-manager__layout-chip--solo";
  }
  if (total === 2) {
    return "staff-gallery-manager__layout-chip--half";
  }
  if (total === 3 && index === 0) {
    return "staff-gallery-manager__layout-chip--wide";
  }
  const pattern = index % 8;
  if (pattern === 0) {
    return "staff-gallery-manager__layout-chip--wide";
  }
  if (pattern === 5) {
    return "staff-gallery-manager__layout-chip--feature";
  }
  return "";
}

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
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removeState, removeAction, removing] = useActionState(
    removePropertyGalleryPhoto,
    initialState,
  );
  const [moveState, moveAction, moving] = useActionState(movePropertyGalleryPhoto, initialState);
  const busy = disabled || isUploading || removing || moving;

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    if (removeState.success || moveState.success) {
      setConfirmingId(null);
      router.refresh();
    }
  }, [moveState.success, removeState.success, router]);

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
    setUploadSuccess(null);
    setIsUploading(true);

    try {
      const uploaded: PropertyGalleryPhoto[] = [];

      for (const file of files) {
        const prepared = await prepareRoomPhotoFile(file);
        uploaded.push(await uploadGalleryPhoto(prepared));
      }

      setPhotos((current) => [...current, ...uploaded]);
      setUploadSuccess(
        uploaded.length === 1
          ? "1 photo added — visible on the gallery page after rooms."
          : `${uploaded.length} photos added — visible on the gallery page after rooms.`,
      );
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
      <StaffBusyEffect
        active={isUploading || removing || moving}
        message={isUploading ? "Uploading photos…" : "Updating gallery…"}
      />
      <div className="staff-gallery-manager__toolbar">
        <div>
          <p className="staff-gallery-manager__count">
            {photos.length} of {MAX_PROPERTY_GALLERY_PHOTOS} photos
          </p>
          <p className="staff-gallery-manager__hint">
            JPEG, PNG, WebP, or GIF · up to 4 MB each. Photos are resized before upload. Use Move
            up/down so the guest order matches what you want.
          </p>
        </div>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={busy || photos.length >= MAX_PROPERTY_GALLERY_PHOTOS}
          id="staff-gallery-upload"
          multiple
          onChange={(event) => void handleUpload(event.target.files)}
          ref={inputRef}
          type="file"
        />
        <label
          className={`button button--primary${busy || photos.length >= MAX_PROPERTY_GALLERY_PHOTOS ? " button--disabled" : ""}`}
          htmlFor="staff-gallery-upload"
        >
          {isUploading ? "Uploading…" : "Add photos"}
        </label>
      </div>

      {isUploading ? (
        <p className="staff-gallery-manager__status" role="status">
          Uploading photos…
        </p>
      ) : null}
      {uploadSuccess ? (
        <p className="form-message form-message--success" role="status">
          {uploadSuccess}
        </p>
      ) : null}
      {uploadError ? (
        <p className="form-message form-message--error" role="alert">
          {uploadError}
        </p>
      ) : null}
      {removeState.error || moveState.error ? (
        <p className="form-message form-message--error" role="alert">
          {removeState.error ?? moveState.error}
        </p>
      ) : null}
      {removeState.success || moveState.success ? (
        <p className="form-message form-message--success" role="status">
          {removeState.success ?? moveState.success}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <>
          <div className="staff-gallery-manager__guest-preview" aria-label="Guest layout preview">
            <p className="staff-gallery-manager__preview-label">Guest layout (after rooms)</p>
            <ul className="staff-gallery-manager__layout-preview">
              {photos.map((photo, index) => (
                <li
                  className={`staff-gallery-manager__layout-chip ${guestLayoutClass(index, photos.length)}`.trim()}
                  key={`layout-${photo.id}`}
                >
                  <img alt="" src={photo.url} />
                  <span>{index + 1}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="staff-gallery-manager__grid">
            {photos.map((photo, index) => {
              const alt = photo.caption ?? `Guesthouse gallery photo ${index + 1} of ${photos.length}`;
              const confirming = confirmingId === photo.id;

              return (
                <li key={photo.id}>
                  <img alt={alt} className="staff-gallery-manager__thumb" src={photo.url} />
                  <span className="staff-gallery-manager__caption">
                    {index + 1} of {photos.length}
                    {index % 8 === 0 || (photos.length === 3 && index === 0)
                      ? " · wider on guest page"
                      : index % 8 === 5
                        ? " · featured on guest page"
                        : ""}
                  </span>
                  <div className="staff-gallery-manager__item-actions">
                    <form action={moveAction}>
      <StaffFormBusyBridge />
                      <input name="photo-id" type="hidden" value={photo.id} />
                      <input name="direction" type="hidden" value="up" />
                      <button
                        aria-label={`Move ${alt} earlier`}
                        className="button button--quiet staff-gallery-manager__action"
                        disabled={busy || index === 0}
                        type="submit"
                      >
                        Up
                      </button>
                    </form>
                    <form action={moveAction}>
      <StaffFormBusyBridge />
                      <input name="photo-id" type="hidden" value={photo.id} />
                      <input name="direction" type="hidden" value="down" />
                      <button
                        aria-label={`Move ${alt} later`}
                        className="button button--quiet staff-gallery-manager__action"
                        disabled={busy || index === photos.length - 1}
                        type="submit"
                      >
                        Down
                      </button>
                    </form>
                    {confirming ? (
                      <form
                        action={removeAction}
                        aria-label={`Confirm remove ${alt}`}
                        className="staff-gallery-manager__confirm"
                      >
      <StaffFormBusyBridge />
                        <input name="photo-id" type="hidden" value={photo.id} />
                        <p className="staff-gallery-manager__confirm-copy">
                          Remove this photo? Guests will no longer see it on the gallery page.
                        </p>
                        <div className="staff-gallery-manager__confirm-actions">
                          <button
                            className="button button--primary staff-gallery-manager__action"
                            disabled={busy}
                            type="submit"
                          >
                            {removing ? "Removing…" : "Remove photo"}
                          </button>
                          <button
                            className="button button--quiet staff-gallery-manager__action"
                            disabled={busy}
                            onClick={() => setConfirmingId(null)}
                            type="button"
                          >
                            Keep it
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        aria-label={`Remove ${alt}`}
                        className="button button--quiet staff-gallery-manager__action"
                        disabled={busy}
                        onClick={() => setConfirmingId(photo.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <div className="staff-empty-state staff-gallery-manager__empty">
          <h3>No guesthouse photos yet</h3>
          <p>
            Add photos of the garden, common areas, and views. Guests see them after the room
            photos.
          </p>
          <label
            className={`button button--primary${busy ? " button--disabled" : ""}`}
            htmlFor="staff-gallery-upload"
          >
            Add photos
          </label>
        </div>
      )}
    </div>
  );
}
