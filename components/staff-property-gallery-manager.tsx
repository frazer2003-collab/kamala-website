"use client";
import { StaffBusyEffect, StaffFormBusyBridge } from "@/components/staff-busy";

import {
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  movePropertyGalleryPhoto,
  removePropertyGalleryPhoto,
  reorderPropertyGalleryPhotos,
  type StaffGalleryState,
} from "@/app/staff/auth-actions";
import { OptimizedImage } from "@/components/optimized-image";
import type { PropertyGalleryPhoto } from "@/lib/property-gallery";
import { prepareRoomPhotoFile } from "@/lib/prepare-room-photo";
import { MAX_PROPERTY_GALLERY_PHOTOS } from "@/lib/room-photo-shared";

const STAFF_GALLERY_THUMB_SIZES = "(max-width: 720px) 45vw, 10rem";

type StaffPropertyGalleryManagerProps = {
  initialPhotos: PropertyGalleryPhoto[];
  disabled: boolean;
  /** When true, guest gallery shows rooms before these photos. */
  roomsShowFirst?: boolean;
};

const initialState: StaffGalleryState = {};

function reorderLocally(
  photos: PropertyGalleryPhoto[],
  fromId: string,
  toId: string,
) {
  if (fromId === toId) {
    return photos;
  }

  const fromIndex = photos.findIndex((photo) => photo.id === fromId);
  const toIndex = photos.findIndex((photo) => photo.id === toId);
  if (fromIndex < 0 || toIndex < 0) {
    return photos;
  }

  const next = [...photos];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
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
  roomsShowFirst = false,
}: StaffPropertyGalleryManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reorderFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [orderedIds, setOrderedIds] = useState(() =>
    initialPhotos.map((photo) => photo.id).join(","),
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [removeState, removeAction, removing] = useActionState(
    removePropertyGalleryPhoto,
    initialState,
  );
  const [moveState, moveAction, moving] = useActionState(movePropertyGalleryPhoto, initialState);
  const [reorderState, reorderAction, reordering] = useActionState(
    reorderPropertyGalleryPhotos,
    initialState,
  );
  const busy = disabled || isUploading || removing || moving || reordering;

  useEffect(() => {
    setPhotos(initialPhotos);
    setOrderedIds(initialPhotos.map((photo) => photo.id).join(","));
  }, [initialPhotos]);

  useEffect(() => {
    if (removeState.success || moveState.success || reorderState.success) {
      setConfirmingId(null);
      router.refresh();
    }
  }, [moveState.success, removeState.success, reorderState.success, router]);

  const submitReorder = useEffectEvent((nextPhotos: PropertyGalleryPhoto[]) => {
    const nextIds = nextPhotos.map((photo) => photo.id).join(",");
    setOrderedIds(nextIds);
    queueMicrotask(() => {
      reorderFormRef.current?.requestSubmit();
    });
  });

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
          ? "1 photo added — visible on the gallery page."
          : `${uploaded.length} photos added — visible on the gallery page.`,
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

  function handleDragStart(event: DragEvent<HTMLLIElement>, photoId: string) {
    if (busy) {
      event.preventDefault();
      return;
    }
    setDraggingId(photoId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", photoId);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>, photoId: string) {
    if (!draggingId || draggingId === photoId || busy) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetId(photoId);
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, photoId: string) {
    event.preventDefault();
    const fromId = event.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setDropTargetId(null);

    if (!fromId || fromId === photoId || busy) {
      return;
    }

    setPhotos((current) => {
      const next = reorderLocally(current, fromId, photoId);
      if (next === current) {
        return current;
      }
      submitReorder(next);
      return next;
    });
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  return (
    <div className="staff-gallery-manager">
      <StaffBusyEffect
        active={isUploading || removing || moving || reordering}
        message={isUploading ? "Uploading photos…" : "Updating gallery…"}
      />
      <form action={reorderAction} className="sr-only" ref={reorderFormRef}>
        <StaffFormBusyBridge />
        <input name="ordered-ids" type="hidden" value={orderedIds} />
        <button type="submit">Save order</button>
      </form>
      <div className="staff-gallery-manager__toolbar">
        <div>
          <p className="staff-gallery-manager__count">
            {photos.length} of {MAX_PROPERTY_GALLERY_PHOTOS} photos
          </p>
          <p className="staff-gallery-manager__hint">
            Drag to set guesthouse photo order
            {roomsShowFirst ? " (after rooms on the guest page)" : ""}. Up/Down works too · JPEG,
            PNG, WebP, or GIF · up to 4 MB each.
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
      {removeState.error || moveState.error || reorderState.error ? (
        <p className="form-message form-message--error" role="alert">
          {removeState.error ?? moveState.error ?? reorderState.error}
        </p>
      ) : null}
      {removeState.success || moveState.success || reorderState.success ? (
        <p className="form-message form-message--success" role="status">
          {removeState.success ?? moveState.success ?? reorderState.success}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <ul className="staff-gallery-manager__grid" aria-label="Guesthouse photo order">
          {photos.map((photo, index) => {
            const alt = photo.caption ?? `Guesthouse gallery photo ${index + 1} of ${photos.length}`;
            const confirming = confirmingId === photo.id;
            const isDragging = draggingId === photo.id;
            const isDropTarget = dropTargetId === photo.id && draggingId !== photo.id;

            return (
              <li
                className={[
                  "staff-gallery-manager__item",
                  isDragging ? "staff-gallery-manager__item--dragging" : "",
                  isDropTarget ? "staff-gallery-manager__item--drop-target" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable={!busy}
                key={photo.id}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => handleDragOver(event, photo.id)}
                onDragStart={(event) => handleDragStart(event, photo.id)}
                onDrop={(event) => handleDrop(event, photo.id)}
              >
                <div className="staff-gallery-manager__thumb">
                  <OptimizedImage
                    alt={alt}
                    className="staff-gallery-manager__thumb-image"
                    fill
                    loading={index < 2 ? "eager" : "lazy"}
                    quality={70}
                    sizes={STAFF_GALLERY_THUMB_SIZES}
                    src={photo.url}
                  />
                  <span className="staff-gallery-manager__order-badge" aria-hidden="true">
                    {index + 1}
                  </span>
                </div>
                <span className="staff-gallery-manager__caption sr-only">
                  Position {index + 1} of {photos.length}
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
      ) : (
        <div className="staff-empty-state staff-gallery-manager__empty">
          <h3>No guesthouse photos yet</h3>
          <p>
            Add photos of the garden, common areas, and views. Guests see them on the gallery page.
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
