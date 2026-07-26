import Link from "next/link";

export type StaffCalendarView = "desk" | "prepare" | "sell";

type StaffCalendarViewNavProps = {
  view: StaffCalendarView;
  monthKey: string;
  fromIso: string;
  toIso: string;
};

const VIEWS: Array<{ id: StaffCalendarView; label: string; hint: string }> = [
  { id: "desk", label: "Desk", hint: "Door tape chart" },
  { id: "prepare", label: "Prepare", hint: "Rooms to clean before arrivals" },
  { id: "sell", label: "Sell", hint: "Nights still available" },
];

function hrefFor(
  view: StaffCalendarView,
  monthKey: string,
  fromIso: string,
  toIso: string,
) {
  const params = new URLSearchParams({
    month: monthKey,
    from: fromIso,
    to: toIso,
  });
  if (view !== "desk") {
    params.set("view", view);
  }
  return `/staff/calendar?${params.toString()}`;
}

export function StaffCalendarViewNav({
  view,
  monthKey,
  fromIso,
  toIso,
}: StaffCalendarViewNavProps) {
  return (
    <nav aria-label="Calendar view" className="staff-calendar-views">
      {VIEWS.map((entry) => {
        const current = entry.id === view;
        return (
          <Link
            aria-current={current ? "page" : undefined}
            className={[
              "staff-calendar-views__link",
              current ? "staff-calendar-views__link--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={hrefFor(entry.id, monthKey, fromIso, toIso)}
            key={entry.id}
            title={entry.hint}
          >
            {entry.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function parseStaffCalendarView(value?: string): StaffCalendarView {
  if (value === "prepare" || value === "sell") {
    return value;
  }
  return "desk";
}
