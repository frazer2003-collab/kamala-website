"use client";

import { useEffect, useRef, useState } from "react";
import type { Room } from "@/lib/content";
import { prepareRoomPhotoFile } from "@/lib/prepare-room-photo";
import { MAX_GALLERY_PHOTOS } from "@/lib/room-photo-shared";

type StaffRoomPhotoFieldsProps = {
  room: Room;
  disabled: boolean;
};

async function uploadRoomPhotoFile(roomId: string, file: File) {
  const formData = new FormData();
  formData.set("room-id", roomId);
  formData.set("photo", file);

  const response = await fetch("/api/staff/room-photos", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Could not upload this photo.");
  }

  return payload.url;
}

export function StaffRoomPhotoFields({ room, disabled }: StaffRoomPhotoFieldsProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(room.imageUrl ?? "");
  const [galleryUrls, setGalleryUrls] = useState(room.galleryUrls);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setCoverUrl(room.imageUrl ?? "");
    setGalleryUrls(room.galleryUrls);
  }, [room.galleryUrls, room.id, room.imageUrl]);

  async function handleCoverUpload(file: File | undefined) {
    if (!file || disabled || isUploading) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const prepared = await prepareRoomPhotoFile(file);
      const url = await uploadRoomPhotoFile(room.id, prepared);
      setCoverUrl(url);
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

    const remainingSlots = MAX_GALLERY_PHOTOS - galleryUrls.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can add up to ${MAX_GALLERY_PHOTOS} gallery photos per room.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setUploadError(null);
    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const prepared = await prepareRoomPhotoFile(file);
        uploadedUrls.push(await uploadRoomPhotoFile(room.id, prepared));
      }

      setGalleryUrls((current) => [...current, ...uploadedUrls]);
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
    <div className="staff-room-photos field-pair--wide">
      <div className="staff-room-photos__section">
        <label htmlFor={`${room.id}-cover-photo`}>Cover photo</label>
        <p className="staff-room-photos__hint">
          JPEG, PNG, WebP, or GIF · up to 4 MB. Large photos are resized and optimized before upload.
        </p>
        {coverUrl ? (
          <div className="staff-room-photos__preview">
            <img alt="" className="staff-room-photos__preview-image" src={coverUrl} />
            <button
              className="button button--quiet staff-room-photos__remove"
              disabled={disabled || isUploading}
              onClick={() => setCoverUrl("")}
              type="button"
            >
              Remove cover
            </button>
          </div>
        ) : null}
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={disabled || isUploading}
          id={`${room.id}-cover-photo`}
          onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
          ref={coverInputRef}
          type="file"
        />
        <input name="image-url" type="hidden" value={coverUrl} />
      </div>

      <div className="staff-room-photos__section">
        <label htmlFor={`${room.id}-gallery-photos`}>More photos</label>
        <p className="staff-room-photos__hint">
          Add up to {MAX_GALLERY_PHOTOS} extra photos for the room detail popup.
        </p>
        {galleryUrls.length > 0 ? (
          <ul className="staff-room-photos__gallery">
            {galleryUrls.map((url) => (
              <li key={url}>
                <img alt="" className="staff-room-photos__thumb" src={url} />
                <button
                  className="button button--quiet staff-room-photos__remove"
                  disabled={disabled || isUploading}
                  onClick={() =>
                    setGalleryUrls((current) => current.filter((entry) => entry !== url))
                  }
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
          disabled={disabled || isUploading || galleryUrls.length >= MAX_GALLERY_PHOTOS}
          id={`${room.id}-gallery-photos`}
          multiple
          onChange={(event) => void handleGalleryUpload(event.target.files)}
          ref={galleryInputRef}
          type="file"
        />
        <input name="gallery-urls" type="hidden" value={galleryUrls.join("\n")} />
      </div>

      {isUploading ? (
        <p className="staff-room-photos__status" role="status">
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
