"use client";

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateGalleryRoomPhotosVisibility,
  type StaffGalleryState,
} from "@/app/staff/auth-actions";
import { StaffBusyEffect, StaffFormBusyBridge } from "@/components/staff-busy";

type StaffGalleryRoomPhotosToggleProps = {
  disabled: boolean;
  showRoomPhotosOnGallery: boolean;
};

const initialState: StaffGalleryState = {};

export function StaffGalleryRoomPhotosToggle({
  disabled,
  showRoomPhotosOnGallery,
}: StaffGalleryRoomPhotosToggleProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [checked, setChecked] = useState(showRoomPhotosOnGallery);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [state, formAction, pending] = useActionState(
    updateGalleryRoomPhotosVisibility,
    initialState,
  );

  const syncFromServer = useEffectEvent((next: boolean) => {
    setChecked(next);
  });

  useEffect(() => {
    syncFromServer(showRoomPhotosOnGallery);
  }, [showRoomPhotosOnGallery]);

  useEffect(() => {
    if (pending) {
      setStatus("saving");
      return;
    }

    if (state.error) {
      setChecked(showRoomPhotosOnGallery);
      setStatus("error");
      return;
    }

    if (state.success) {
      setStatus("saved");
      router.refresh();
    }
  }, [pending, router, showRoomPhotosOnGallery, state.error, state.success]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatus("idle");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [status]);

  const busy = disabled || pending;

  return (
    <form action={formAction} className="staff-gallery-room-toggle" ref={formRef}>
      <StaffBusyEffect active={pending} message="Updating gallery…" />
      <StaffFormBusyBridge />
      {/* Unchecked submits as empty; action treats missing value as off. */}
      <label className="checkbox-field staff-gallery-room-toggle__label">
        <input
          checked={checked}
          disabled={busy}
          name="show-room-photos"
          onChange={(event) => {
            if (busy) {
              return;
            }
            const next = event.target.checked;
            setChecked(next);
            setStatus("saving");
            queueMicrotask(() => {
              formRef.current?.requestSubmit();
            });
          }}
          type="checkbox"
          value="1"
        />
        <span>
          <strong>Show room photos on the guest gallery</strong>
          <span>
            When off, guests only see guesthouse photos below. Room photos stay on each room page.
          </span>
        </span>
      </label>
      <p
        className={[
          "staff-gallery-room-toggle__status",
          status === "error" ? "staff-gallery-room-toggle__status--error" : "",
          status === "saved" ? "staff-gallery-room-toggle__status--saved" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role={status === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? checked
              ? "Saved — room photos show on the guest gallery."
              : "Saved — room photos hidden from the guest gallery."
            : status === "error"
              ? state.error ?? "Could not save. Try again."
              : checked
                ? "On for guests"
                : "Off for guests"}
      </p>
    </form>
  );
}
