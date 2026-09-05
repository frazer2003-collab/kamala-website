"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "@/app/guest-stay-calendar.css";
import {
  buildCalendarDays,
  formatCalendarMonthLabel,
  getPropertyTodayIso,
  shiftCalendarMonth,
} from "@/lib/calendar";
import type { GuestNightStatus } from "@/lib/guest-night-availability-shared";
import { GUEST_NIGHT_AVAILABILITY_MAX_DAYS } from "@/lib/guest-night-availability-shared";
import { MAX_STAY_NIGHTS } from "@/lib/stay-dates";

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

type NightMap = Record<string, GuestNightStatus>;

type GuestStayCalendarProps = {
  arrival: string;
  departure: string;
  focus: "arrival" | "departure";
  onClose: () => void;
  onChange: (next: { arrival: string; departure: string }) => void;
  todayIso?: string;
};

type CacheEntry = {
  status: "ok" | "verify-failed";
  nights: NightMap;
  fetchedAt: number;
};

const nightCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthFromIso(iso: string) {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
  };
}

function windowForMonth(year: number, month: number, todayIso: string) {
  const start = `${monthKey(year, month)}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonth = `${monthKey(year, month)}-${String(daysInMonth).padStart(2, "0")}`;
  const next = shiftCalendarMonth(year, month, 1);
  const nextDays = new Date(next.year, next.month, 0).getDate();
  const endOfNext = `${monthKey(next.year, next.month)}-${String(nextDays).padStart(2, "0")}`;

  let from = start < todayIso ? todayIso : start;
  let to = endOfNext;

  const latest = addIsoDays(todayIso, GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
  if (to > latest) {
    to = latest;
  }
  if (from > to) {
    from = todayIso;
    to = todayIso > endOfMonth ? todayIso : endOfMonth;
    if (to > latest) {
      to = latest;
    }
  }

  return { from, to, cacheKey: `${from}|${to}` };
}

async function fetchNightWindow(from: string, to: string): Promise<CacheEntry> {
  const cached = nightCache.get(`${from}|${to}`);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const response = await fetch(
    `/api/guest/night-availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!response.ok) {
    const failed: CacheEntry = {
      status: "verify-failed",
      nights: {},
      fetchedAt: Date.now(),
    };
    nightCache.set(`${from}|${to}`, failed);
    return failed;
  }

  const data = (await response.json()) as {
    status?: "ok" | "verify-failed";
    nights?: NightMap;
  };
  const entry: CacheEntry = {
    status: data.status === "ok" ? "ok" : "verify-failed",
    nights: data.nights ?? {},
    fetchedAt: Date.now(),
  };
  nightCache.set(`${from}|${to}`, entry);
  return entry;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function GuestStayCalendar({
  arrival,
  departure,
  focus,
  onClose,
  onChange,
  todayIso: todayProp,
}: GuestStayCalendarProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const todayIso = todayProp ?? getPropertyTodayIso();
  const initialMonth = parseMonthFromIso(
    focus === "departure" && departure ? departure : arrival || todayIso,
  );
  const [visible, setVisible] = useState(initialMonth);
  const [draftArrival, setDraftArrival] = useState(arrival);
  const [draftDeparture, setDraftDeparture] = useState(departure);
  const [picking, setPicking] = useState<"arrival" | "departure">(
    focus === "departure" && arrival ? "departure" : "arrival",
  );
  const [nights, setNights] = useState<NightMap>({});
  const [loadStatus, setLoadStatus] = useState<"loading" | "ok" | "verify-failed">(
    "loading",
  );
  const [mounted, setMounted] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const { from, to, cacheKey } = windowForMonth(
      visible.year,
      visible.month,
      todayIso,
    );

    const cached = nightCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setNights((prev) => ({ ...prev, ...cached.nights }));
      setLoadStatus(cached.status);
      return;
    }

    setLoadStatus("loading");
    fetchNightWindow(from, to).then((entry) => {
      if (cancelled) {
        return;
      }
      setNights((prev) => ({ ...prev, ...entry.nights }));
      setLoadStatus(entry.status);
    });

    return () => {
      cancelled = true;
    };
  }, [visible.year, visible.month, todayIso]);

  const days = useMemo(
    () => buildCalendarDays(visible.year, visible.month),
    [visible.year, visible.month],
  );

  const maxDeparture = draftArrival
    ? addIsoDays(draftArrival, MAX_STAY_NIGHTS)
    : addIsoDays(todayIso, MAX_STAY_NIGHTS);

  const earliestMonth = parseMonthFromIso(todayIso);
  const canGoPrev =
    visible.year > earliestMonth.year ||
    (visible.year === earliestMonth.year && visible.month > earliestMonth.month);

  const latestIso = addIsoDays(todayIso, GUEST_NIGHT_AVAILABILITY_MAX_DAYS - 1);
  const latestMonth = parseMonthFromIso(latestIso);
  const canGoNext =
    visible.year < latestMonth.year ||
    (visible.year === latestMonth.year && visible.month < latestMonth.month);

  const isNightFull = useCallback(
    (iso: string) => {
      if (loadStatus !== "ok") {
        return false;
      }
      return nights[iso] === "full";
    },
    [loadStatus, nights],
  );

  function commit(nextArrival: string, nextDeparture: string) {
    setDraftArrival(nextArrival);
    setDraftDeparture(nextDeparture);
    onChange({ arrival: nextArrival, departure: nextDeparture });
  }

  function handleDayClick(iso: string, selectable: boolean, full: boolean) {
    if (!selectable) {
      if (full) {
        setStatusNote("That night is fully booked — try another date.");
      }
      return;
    }

    setStatusNote(null);

    if (picking === "arrival") {
      const nextDeparture =
        draftDeparture > addIsoDays(iso, 1) &&
        draftDeparture <= addIsoDays(iso, MAX_STAY_NIGHTS)
          ? draftDeparture
          : addIsoDays(iso, 1);
      commit(iso, nextDeparture);
      setPicking("departure");
      return;
    }

    // Tapping check-in again while choosing check-out restarts the range.
    if (iso === draftArrival) {
      setPicking("departure");
      return;
    }

    if (iso < draftArrival) {
      commit(iso, addIsoDays(iso, 1));
      setPicking("departure");
      return;
    }

    commit(draftArrival, iso);
  }

  function dayState(iso: string, inCurrentMonth: boolean) {
    const past = iso < todayIso;
    const full = isNightFull(iso);
    const isArrival = iso === draftArrival;
    const isDeparture = iso === draftDeparture;
    const inRange =
      Boolean(draftArrival) &&
      Boolean(draftDeparture) &&
      iso > draftArrival &&
      iso < draftDeparture;

    let selectable = inCurrentMonth && !past;
    if (picking === "arrival") {
      selectable = selectable && !full;
    } else if (isArrival) {
      // Keep check-in tappable (and fully visible) while choosing check-out.
      selectable = true;
    } else if (iso < draftArrival) {
      // Allow restarting the range from an earlier open night.
      selectable = selectable && !full;
    } else {
      selectable = selectable && iso <= maxDeparture;
      // Checkout morning may land on a "full" night cell — still allow it.
    }

    const showFullMark = full && !isArrival && !isDeparture;
    const fullBlocked = showFullMark && !selectable;

    return {
      past,
      full,
      fullBlocked,
      showFullMark,
      isArrival,
      isDeparture,
      inRange,
      selectable,
      isToday: iso === todayIso,
    };
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="guest-stay-cal">
      <button
        aria-label="Close calendar"
        className="guest-stay-cal__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="guest-stay-cal__sheet"
        ref={panelRef}
        role="dialog"
      >
        <div className="guest-stay-cal__grab" aria-hidden="true" />
        <header className="guest-stay-cal__header">
          <div className="guest-stay-cal__heading">
            <h2 id={titleId}>
              {picking === "arrival" ? "Select check-in" : "Select check-out"}
            </h2>
            <p
              className={`guest-stay-cal__hint${statusNote ? " guest-stay-cal__hint--alert" : ""}`}
              aria-live="polite"
            >
              {statusNote ??
                (picking === "arrival"
                  ? "Dates marked Full have no rooms left that night."
                  : "Check-out can land on a Full morning.")}
            </p>
          </div>
          <button
            aria-label="Close"
            className="guest-stay-cal__close button button--quiet"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="guest-stay-cal__month-nav">
          <button
            aria-label="Previous month"
            className="guest-stay-cal__nav-btn"
            disabled={!canGoPrev}
            onClick={() =>
              setVisible((current) =>
                shiftCalendarMonth(current.year, current.month, -1),
              )
            }
            type="button"
          >
            ‹
          </button>
          <p className="guest-stay-cal__month-label">
            {formatCalendarMonthLabel(visible.year, visible.month)}
          </p>
          <button
            aria-label="Next month"
            className="guest-stay-cal__nav-btn"
            disabled={!canGoNext}
            onClick={() =>
              setVisible((current) =>
                shiftCalendarMonth(current.year, current.month, 1),
              )
            }
            type="button"
          >
            ›
          </button>
        </div>

        <div className="guest-stay-cal__weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div
          aria-busy={loadStatus === "loading"}
          className="guest-stay-cal__grid"
          role="grid"
          aria-label={formatCalendarMonthLabel(visible.year, visible.month)}
        >
          {days.map((day) => {
            const state = dayState(day.iso, day.inCurrentMonth);
            const labelDate = new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(day.date);

            let ariaLabel = labelDate;
            if (state.full) {
              ariaLabel = `${labelDate}, fully booked`;
            } else if (state.past) {
              ariaLabel = `${labelDate}, past`;
            }
            if (state.isArrival) {
              ariaLabel = `${ariaLabel}, check-in`;
            }
            if (state.isDeparture) {
              ariaLabel = `${ariaLabel}, check-out`;
            }

            const className = [
              "guest-stay-cal__day",
              day.inCurrentMonth ? "" : "guest-stay-cal__day--outside",
              state.fullBlocked ? "guest-stay-cal__day--full" : "",
              state.showFullMark && !state.fullBlocked
                ? "guest-stay-cal__day--full-soft"
                : "",
              state.past && !state.isArrival && !state.isDeparture
                ? "guest-stay-cal__day--past"
                : "",
              state.isToday ? "guest-stay-cal__day--today" : "",
              state.isArrival ? "guest-stay-cal__day--arrival" : "",
              state.isDeparture ? "guest-stay-cal__day--departure" : "",
              state.inRange ? "guest-stay-cal__day--range" : "",
              loadStatus === "loading" ? "guest-stay-cal__day--loading" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                aria-disabled={!state.selectable}
                aria-label={ariaLabel}
                aria-pressed={state.isArrival || state.isDeparture}
                className={className}
                data-selectable={state.selectable ? "true" : "false"}
                key={`${day.iso}-${day.inCurrentMonth ? "in" : "out"}`}
                onClick={() =>
                  handleDayClick(day.iso, state.selectable, state.full)
                }
                type="button"
              >
                <span className="guest-stay-cal__day-num">{day.date.getDate()}</span>
                {state.showFullMark ? (
                  <span aria-hidden="true" className="guest-stay-cal__day-mark">
                    Full
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <footer className="guest-stay-cal__footer">
          <p>
            {draftArrival && draftDeparture
              ? `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${draftArrival}T00:00:00`))} → ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${draftDeparture}T00:00:00`))}`
              : "Choose your stay dates"}
          </p>
          <button
            className="button button--primary guest-stay-cal__done"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
