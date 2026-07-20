"use client";

import { useState } from "react";

export function StaffIcalCopyField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById(id) as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="staff-room-ical__export-block">
      <label className="staff-room-ical__unit-label" htmlFor={id}>
        {label}
      </label>
      <div className="staff-room-ical__export">
        <input id={id} readOnly type="text" value={value} />
        <button className="button button--secondary" onClick={handleCopy} type="button">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
