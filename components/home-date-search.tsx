"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { getPropertyTodayIso } from "@/lib/calendar";
import {
  MAX_STAY_NIGHTS,
  MIN_STAY_NIGHTS,
  refreshStaleStayDates,
} from "@/lib/stay-dates";

const GuestStayCalendar = dynamic(
  () =>
    import("@/components/guest-stay-calendar").then(
      (module) => module.GuestStayCalendar,
    ),
  { ssr: false },
);

const GUEST_DATES_BUSY_CLASS = "guest-dates-busy";

type HomeDateSearchProps = {
  arrival?: string;
  departure?: string;
  dateError?: boolean;
};

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

function formatSegmentDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function SearchDateSegment({
  disabled = false,
  id,
  label,
  name,
  onOpen,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  name: string;
  onOpen: () => void;
  value: string;
}) {
  return (
    <div className="search-bar__segment">
      <span className="search-bar__label" id={`${id}-label`}>
        {label}
      </span>
      <input name={name} type="hidden" value={value} />
      <span aria-hidden="true" className="search-bar__value" id={`${id}-value`}>
        {value ? formatSegmentDate(value) : "—"}
      </span>
      <button
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        className="search-bar__picker"
        disabled={disabled}
        id={id}
        onClick={onOpen}
        type="button"
      />
    </div>
  );
}

/** Client date form only — hero H1/lede are server-rendered above/below this form. */
export function HomeDateSearch({
  arrival,
  departure,
  dateError = false,
}: HomeDateSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const [isPending, startTransition] = useTransition();
  const [overlayReady, setOverlayReady] = useState(false);
  const [calendarFocus, setCalendarFocus] = useState<"arrival" | "departure" | null>(
    null,
  );
  const propertyToday = useMemo(() => getPropertyTodayIso(), []);
  const defaultArrival = arrival ?? propertyToday;
  const defaultDeparture =
    departure ?? (arrival ? addIsoDays(arrival, 1) : addIsoDays(propertyToday, 1));
  const [arrivalValue, setArrivalValue] = useState(defaultArrival);
  const [departureValue, setDepartureValue] = useState(defaultDeparture);

  useEffect(() => {
    setOverlayReady(true);
  }, []);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const root = document.documentElement;
    const main = document.querySelector("main.guest-site");
    const previousOverflow = document.body.style.overflow;

    root.classList.add(GUEST_DATES_BUSY_CLASS);
    document.body.style.overflow = "hidden";
    main?.setAttribute("inert", "");

    return () => {
      root.classList.remove(GUEST_DATES_BUSY_CLASS);
      document.body.style.overflow = previousOverflow;
      main?.removeAttribute("inert");
    };
  }, [isPending]);

  useEffect(() => {
    const refreshed = refreshStaleStayDates(arrival, departure);
    if (!refreshed) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("arrival", refreshed.arrival);
    params.set("departure", refreshed.departure);
    params.delete("error");
    router.replace(`/?${params.toString()}`);
  }, [arrival, departure, router, searchParams]);

  useEffect(() => {
    const nextArrival = arrival ?? propertyToday;
    setArrivalValue(nextArrival);
    setDepartureValue(
      departure ?? (arrival ? addIsoDays(arrival, 1) : addIsoDays(propertyToday, 1)),
    );
  }, [arrival, departure, propertyToday]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextArrival = String(formData.get("arrival") ?? "");
    const nextDeparture = String(formData.get("departure") ?? "");
    const params = new URLSearchParams(searchParams.toString());

    params.set("arrival", nextArrival);
    params.set("departure", nextDeparture);
    params.delete("error");

    startTransition(() => {
      router.push(`/?${params.toString()}#rooms`);
    });
  }

  const statusId = `${formId}-status`;
  const arrivalTriggerId = `${formId}-arrival`;
  const departureTriggerId = `${formId}-departure`;

  function closeCalendar() {
    const focusId =
      calendarFocus === "departure" ? departureTriggerId : arrivalTriggerId;
    setCalendarFocus(null);
    queueMicrotask(() => {
      document.getElementById(focusId)?.focus();
    });
  }

  return (
    <>
      <form
        aria-busy={isPending}
        aria-describedby={isPending ? `${statusId} home-dates-label` : "home-dates-label"}
        aria-label="Check availability for your stay"
        className={`search-bar search-bar--atmosphere${isPending ? " search-bar--pending" : ""}`}
        onSubmit={handleSubmit}
      >
        <div className="search-bar__fields">
          <SearchDateSegment
            disabled={isPending}
            id={arrivalTriggerId}
            label="Check in"
            name="arrival"
            onOpen={() => setCalendarFocus("arrival")}
            value={arrivalValue}
          />
          <div aria-hidden="true" className="search-bar__divider" />
          <SearchDateSegment
            disabled={isPending}
            id={departureTriggerId}
            label="Check out"
            name="departure"
            onOpen={() => setCalendarFocus("departure")}
            value={departureValue}
          />
        </div>
        <button
          aria-disabled={isPending}
          className="search-bar__submit button button--primary"
          disabled={isPending}
          type="submit"
        >
          <span className="search-bar__submit-label">
            {isPending ? "Checking dates…" : "See available rooms"}
          </span>
        </button>
      </form>

      {dateError ? (
        <p className="form-message form-message--error hero-atmosphere__message" role="alert">
          Check-out must be after check-in. Choose a stay between {MIN_STAY_NIGHTS} and{" "}
          {MAX_STAY_NIGHTS} nights, starting from today.
        </p>
      ) : null}

      {calendarFocus ? (
        <GuestStayCalendar
          arrival={arrivalValue}
          departure={departureValue}
          focus={calendarFocus}
          onChange={({ arrival: nextArrival, departure: nextDeparture }) => {
            setArrivalValue(nextArrival);
            setDepartureValue(nextDeparture);
          }}
          onClose={closeCalendar}
          todayIso={propertyToday}
        />
      ) : null}

      {overlayReady && isPending
        ? createPortal(
            <div
              aria-labelledby={statusId}
              aria-modal="true"
              className="guest-dates-busy-overlay"
              role="alertdialog"
            >
              <p
                className="guest-dates-busy-overlay__label"
                id={statusId}
                role="status"
                aria-live="assertive"
              >
                Checking which rooms are free for your stay…
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
