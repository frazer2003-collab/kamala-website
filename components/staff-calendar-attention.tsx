"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StaffCalendarAttentionProps = {
  unassignedCount: number;
  arrivingCount: number;
  monthKey: string;
  fromIso: string;
  toIso: string;
};

function boardHref(
  monthKey: string,
  fromIso: string,
  toIso: string,
  hash?: string,
) {
  const params = new URLSearchParams({
    month: monthKey,
    from: fromIso,
    to: toIso,
  });
  const path = `/staff/calendar?${params.toString()}`;
  return hash ? `${path}#${hash}` : path;
}

export function StaffCalendarAttention({
  unassignedCount,
  arrivingCount,
  monthKey,
  fromIso,
  toIso,
}: StaffCalendarAttentionProps) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const hint = useMemo(() => {
    if (!normalized) {
      return "Find a guest on the tape with browser find (⌘F / Ctrl+F), or open Prepare for arrivals.";
    }
    return `Looking for “${query.trim()}” — use browser find on the Desk tape, or switch to Prepare.`;
  }, [normalized, query]);

  return (
    <div className="staff-calendar-attention">
      <div className="staff-calendar-attention__filters" aria-label="Needs attention">
        <Link
          className={[
            "staff-calendar-attention__chip",
            unassignedCount > 0 ? "staff-calendar-attention__chip--urgent" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          href={boardHref(monthKey, fromIso, toIso, "need-room")}
        >
          {unassignedCount} need room #
        </Link>
        <Link
          className="staff-calendar-attention__chip"
          href={`/staff/calendar?${new URLSearchParams({
            month: monthKey,
            from: fromIso,
            to: toIso,
            view: "prepare",
          }).toString()}`}
        >
          {arrivingCount} arriving
        </Link>
        <Link
          className="staff-calendar-attention__chip"
          href={`/staff/calendar?${new URLSearchParams({
            month: monthKey,
            from: fromIso,
            to: toIso,
            view: "sell",
          }).toString()}`}
        >
          Nights to sell
        </Link>
      </div>

      <label className="staff-calendar-attention__search">
        <span className="sr-only">Find guest or room</span>
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find guest or room #"
          type="search"
          value={query}
        />
      </label>
      <p className="staff-calendar-attention__hint">{hint}</p>
    </div>
  );
}
