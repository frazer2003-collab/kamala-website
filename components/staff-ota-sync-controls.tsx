"use client";

import { useFormStatus } from "react-dom";

export function StaffOtaSyncControls() {
  const { pending } = useFormStatus();

  return (
    <>
      <button className="button button--quiet" disabled={pending} type="submit">
        {pending ? "Syncing…" : "Sync OTA bookings"}
      </button>
      {pending ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="staff-ota-sync-overlay"
          role="status"
        >
          <div className="staff-ota-sync-popup">
            <span aria-hidden="true" className="staff-ota-sync-popup__spinner" />
            <p>Syncing OTA bookings…</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
