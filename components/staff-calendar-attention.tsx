"use client";

import Link from "next/link";

type StaffCalendarAttentionProps = {
  unassignedCount: number;
  arrivingCount: number;
  monthKey: string;
  fromIso: string;
  toIso: string;
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number | null;
  firstNeedRoomId?: string;
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
  query,
  onQueryChange,
  matchCount,
  firstNeedRoomId,
}: StaffCalendarAttentionProps) {
  const needRoomHash = firstNeedRoomId ? `need-room-${firstNeedRoomId}` : "need-room";
  const hint =
    matchCount === null
      ? "Type a guest name or room number to highlight matching stays on the tape."
      : matchCount === 0
        ? `No stays match “${query.trim()}”.`
        : `${matchCount} stay${matchCount === 1 ? "" : "s"} match “${query.trim()}”.`;

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
          href={boardHref(monthKey, fromIso, toIso, needRoomHash)}
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
          {arrivingCount} arriving soon
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
          aria-controls="staff-calendar-search-status"
          autoComplete="off"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find guest or room #"
          type="search"
          value={query}
        />
      </label>
      <p
        aria-live="polite"
        className="staff-calendar-attention__hint"
        id="staff-calendar-search-status"
        role="status"
      >
        {hint}
      </p>
    </div>
  );
}
