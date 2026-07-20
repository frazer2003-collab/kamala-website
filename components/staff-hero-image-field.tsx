"use client";
import { StaffBusyEffect, StaffFormBusyBridge } from "@/components/staff-busy";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { removeHeroImage, type StaffSettingsState } from "@/app/staff/auth-actions";
import { prepareRoomPhotoFile } from "@/lib/prepare-room-photo";

type StaffHeroImageFieldProps = {
  heroImageUrl: string | null;
  disabled: boolean;
};

const initialState: StaffSettingsState = {};

async function uploadHeroImageFile(file: File) {
  const formData = new FormData();
  formData.set("photo", file);

  const response = await fetch("/api/staff/hero-image", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Could not upload this photo.");
  }

  return payload.url;
}

export function StaffHeroImageField({ heroImageUrl, disabled }: StaffHeroImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState(heroImageUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [removeState, removeAction, removing] = useActionState(removeHeroImage, initialState);

  useEffect(() => {
    setPreviewUrl(heroImageUrl);
  }, [heroImageUrl]);

  useEffect(() => {
    if (removeState.success) {
      setPreviewUrl(null);
      router.refresh();
    }
  }, [removeState.success, router]);

  async function handleUpload(file: File | undefined) {
    if (!file || disabled || isUploading) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const prepared = await prepareRoomPhotoFile(file);
      const url = await uploadHeroImageFile(prepared);
      setPreviewUrl(url);
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload this photo.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="staff-hero-image">
      <StaffBusyEffect active={isUploading || removing} />
      <div className="staff-hero-image__preview-shell">
        {previewUrl ? (
          <div
            className="staff-hero-image__preview"
            style={{ backgroundImage: `url("${previewUrl}")` }}
          >
            <div className="staff-hero-image__preview-overlay" aria-hidden="true" />
            <p className="staff-hero-image__preview-copy">
              <span className="section-note">Preview</span>
              <strong>Homepage hero background</strong>
            </p>
          </div>
        ) : (
          <div className="staff-hero-image__preview staff-hero-image__preview--empty">
            <p>No homepage background photo yet.</p>
          </div>
        )}
      </div>

      <p className="staff-hero-image__hint">
        Wide landscape photos work best. JPEG, PNG, WebP, or GIF · up to 4 MB. The
        image is resized before upload and shown behind the date search on the home page.
      </p>

      <div className="staff-hero-image__actions">
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || isUploading || removing}
          id="staff-hero-image-upload"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <label
          className={`button button--primary${disabled || isUploading || removing ? " button--disabled" : ""}`}
          htmlFor="staff-hero-image-upload"
        >
          {isUploading ? "Uploading..." : previewUrl ? "Replace photo" : "Upload photo"}
        </label>
        {previewUrl ? (
          <form action={removeAction}>
      <StaffFormBusyBridge />
            <button
              className="button button--quiet"
              disabled={disabled || isUploading || removing}
              type="submit"
            >
              {removing ? "Removing..." : "Remove photo"}
            </button>
          </form>
        ) : null}
      </div>

      {isUploading ? (
        <p className="staff-hero-image__status" role="status">
          Uploading homepage photo...
        </p>
      ) : null}
      {uploadError ? (
        <p className="form-message form-message--error" role="alert">
          {uploadError}
        </p>
      ) : null}
      {removeState.error ? (
        <p className="form-message form-message--error" role="alert">
          {removeState.error}
        </p>
      ) : null}
      {removeState.success ? (
        <p className="form-message form-message--success" role="status">
          {removeState.success}
        </p>
      ) : null}
    </div>
  );
}
