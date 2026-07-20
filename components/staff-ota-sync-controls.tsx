"use client";

import { useFormStatus } from "react-dom";

export function StaffOtaSyncControls() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--quiet" disabled={pending} type="submit">
      {pending ? "Syncing channel calendars…" : "Sync channel calendars"}
    </button>
  );
}
