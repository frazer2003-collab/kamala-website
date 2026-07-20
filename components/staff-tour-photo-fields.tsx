"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StaffBusyEffect } from "@/components/staff-busy";
import { prepareRoomPhotoFile } from "@/lib/prepare-room-photo";
import { MAX_TOUR_GALLERY_PHOTOS } from "@/lib/tour-catalog";
import type { StaffTour } from "@/lib/tours";

type StaffTourPhotoFieldsProps = {
  tour: StaffTour;
  disabled: boolean;
};

async function uploadTourPhotoFile(tourId: string, file: File, kind: "cover" | "gallery") {
  const formData = new FormData();
  formData.set("tour-id", tourId);
  formData.set("photo", file);
  formData.set("kind", kind);

  const response = await fetch("/api/staff/tour-photos", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    url?: string;
    storagePath?: string;
    galleryUrls?: string[];
    error?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Could not upload this photo.");
  }

  return payload;
}

export function StaffTourPhotoFields({ tour, disabled }: StaffTourPhotoFieldsProps) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(tour.imageUrl ?? "");
  const [storagePath, setStoragePath] = useState(tour.imageStoragePath ?? "");
  const [galleryUrls, setGalleryUrls] = useState(tour.galleryUrls);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setCoverUrl(tour.imageUrl ?? "");
    setStoragePath(tour.imageStoragePath ?? "");
    setGalleryUrls(tour.galleryUrls);
  }, [tour.galleryUrls, tour.id, tour.imageStoragePath, tour.imageUrl]);

  async function handleCoverUpload(file: File | undefined) {
    if (!file || disabled || isUploading) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const prepared = await prepareRoomPhotoFile(file);
      const result = await uploadTourPhotoFile(tour.id, prepared, "cover");
      setCoverUrl(result.url!);
      setStoragePath(result.storagePath ?? "");
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload cover photo.");
    } finally {
      setIsUploading(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  async function handleGalleryUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled || isUploading) {
      return;
    }

    const remainingSlots = MAX_TOUR_GALLERY_PHOTOS - galleryUrls.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can add up to ${MAX_TOUR_GALLERY_PHOTOS} extra photos per tour.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setUploadError(null);
    setIsUploading(true);

    try {
      for (const file of files) {
        const prepared = await prepareRoomPhotoFile(file);
        const result = await uploadTourPhotoFile(tour.id, prepared, "gallery");
        if (result.galleryUrls) {
          setGalleryUrls(result.galleryUrls);
        }
      }

      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload gallery photos.");
    } finally {
      setIsUploading(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="staff-tour-photos field-pair--wide">
      <StaffBusyEffect active={isUploading} message="Uploading photo…" />
      <div className="staff-tour-photos__section">
        <label>Cover photo</label>
        <p className="staff-tour-photos__hint">
          Shown on the tour card. JPEG, PNG, WebP, or GIF · up to 4 MB. Saves automatically.
        </p>
        {coverUrl ? (
          <div className="staff-tour-photos__preview">
            <img alt="" className="staff-tour-photos__preview-image" src={coverUrl} />
            <button
              className="button button--quiet staff-tour-photos__remove"
              disabled={disabled || isUploading}
              onClick={() => {
                setCoverUrl("");
                setStoragePath("");
              }}
              type="button"
            >
              Remove cover
            </button>
          </div>
        ) : null}
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || isUploading}
          id={`${tour.id}-cover-photo`}
          onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
          ref={coverInputRef}
          type="file"
        />
        <label
          className={`button button--secondary${disabled || isUploading ? " button--disabled" : ""}`}
          htmlFor={`${tour.id}-cover-photo`}
        >
          {isUploading ? "Uploading..." : coverUrl ? "Replace cover" : "Upload cover photo"}
        </label>
        <input name="image-url" type="hidden" value={coverUrl} />
        <input name="image-storage-path" type="hidden" value={storagePath} />
      </div>

      <div className="staff-tour-photos__section">
        <label>More photos</label>
        <p className="staff-tour-photos__hint">
          Optional extra images (up to {MAX_TOUR_GALLERY_PHOTOS}). Saves automatically after upload.
        </p>
        {galleryUrls.length > 0 ? (
          <ul className="staff-tour-photos__gallery">
            {galleryUrls.map((url) => (
              <li key={url}>
                <img alt="" className="staff-tour-photos__thumb" src={url} />
                <button
                  className="button button--quiet staff-tour-photos__remove"
                  disabled={disabled || isUploading}
                  onClick={() => setGalleryUrls((current) => current.filter((entry) => entry !== url))}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || isUploading || galleryUrls.length >= MAX_TOUR_GALLERY_PHOTOS}
          id={`${tour.id}-gallery-photos`}
          multiple
          onChange={(event) => void handleGalleryUpload(event.target.files)}
          ref={galleryInputRef}
          type="file"
        />
        <label
          className={`button button--secondary${
            disabled || isUploading || galleryUrls.length >= MAX_TOUR_GALLERY_PHOTOS
              ? " button--disabled"
              : ""
          }`}
          htmlFor={`${tour.id}-gallery-photos`}
        >
          Add photos
        </label>
        <input name="gallery-urls" type="hidden" value={galleryUrls.join("\n")} />
      </div>

      {isUploading ? (
        <p className="staff-tour-photos__status" role="status">
          Uploading photo...
        </p>
      ) : null}
      {uploadError ? (
        <p className="form-message form-message--error" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
