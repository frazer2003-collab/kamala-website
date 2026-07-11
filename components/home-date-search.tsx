"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import {
  buildAtmosphereHeadline,
  buildAtmosphereLede,
  getGuesthouseLocationLabel,
} from "@/lib/home-hero-copy";
import { getPropertyTodayIso } from "@/lib/calendar";

type HomeDateSearchProps = {
  arrival?: string;
  departure?: string;
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
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
  id,
  label,
  min,
  name,
  onChange,
  value,
}: {
  id: string;
  label: string;
  min: string;
  name: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  function openPicker(input: HTMLInputElement) {
    if (typeof input.showPicker !== "function") {
      return;
    }

    try {
      input.showPicker();
    } catch {
      // Browser may block showPicker without a user gesture.
    }
  }

  return (
    <label className="search-bar__segment" htmlFor={id}>
      <span className="search-bar__label">{label}</span>
      <input
        autoComplete="off"
        className="search-bar__input"
        id={id}
        min={min}
        name={name}
        onChange={onChange}
        onClick={(event) => openPicker(event.currentTarget)}
        required
        type="date"
        value={value}
      />
      <span aria-hidden="true" className="search-bar__value">
        {value ? formatSegmentDate(value) : "Pick a date"}
      </span>
    </label>
  );
}

export function HomeDateSearch({
  arrival,
  departure,
  propertyName,
  propertyTagline,
  addressLine,
  dateError,
}: HomeDateSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const propertyToday = useMemo(() => getPropertyTodayIso(), []);
  const defaultArrival = arrival ?? propertyToday;
  const defaultDeparture =
    departure ?? (arrival ? addIsoDays(arrival, 1) : addIsoDays(propertyToday, 1));
  const [arrivalValue, setArrivalValue] = useState(defaultArrival);
  const [departureValue, setDepartureValue] = useState(defaultDeparture);

  const locationLabel = useMemo(
    () => getGuesthouseLocationLabel(addressLine, propertyName),
    [addressLine, propertyName],
  );
  const headline = useMemo(
    () => buildAtmosphereHeadline(locationLabel, propertyName),
    [locationLabel, propertyName],
  );
  const lede = useMemo(
    () => buildAtmosphereLede(locationLabel, propertyTagline, addressLine),
    [addressLine, locationLabel, propertyTagline],
  );

  useEffect(() => {
    const nextArrival = arrival ?? propertyToday;
    setArrivalValue(nextArrival);
    setDepartureValue(
      departure ?? (arrival ? addIsoDays(arrival, 1) : addIsoDays(propertyToday, 1)),
    );
  }, [arrival, departure, propertyToday]);

  function handleArrivalChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextArrival = event.target.value;
    setArrivalValue(nextArrival);

    if (nextArrival) {
      setDepartureValue(addIsoDays(nextArrival, 1));
    }
  }

  const departureMin = arrivalValue ? addIsoDays(arrivalValue, 1) : addIsoDays(propertyToday, 1);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextArrival = String(formData.get("arrival") ?? "");
    const nextDeparture = String(formData.get("departure") ?? "");
    const params = new URLSearchParams(searchParams.toString());

    params.set("arrival", nextArrival);
    params.set("departure", nextDeparture);
    params.delete("error");

    router.push(`/?${params.toString()}#rooms`);
  }

  return (
    <section className="hero-atmosphere" aria-labelledby={`${formId}-title`} id="dates">
      <div className="hero-atmosphere__copy">
        <p className="hero-atmosphere__brand">{locationLabel}</p>
        <h1 id={`${formId}-title`}>{headline}</h1>
        <p className="hero-atmosphere__lede">{lede}</p>
      </div>

      <form
        aria-label="Check availability for your stay"
        className="search-bar search-bar--atmosphere hero-atmosphere__search"
        onSubmit={handleSubmit}
      >
        <div className="search-bar__fields">
          <SearchDateSegment
            id={`${formId}-arrival`}
            label="Check in"
            min={propertyToday}
            name="arrival"
            onChange={handleArrivalChange}
            value={arrivalValue}
          />
          <div aria-hidden="true" className="search-bar__divider" />
          <SearchDateSegment
            id={`${formId}-departure`}
            label="Check out"
            min={departureMin}
            name="departure"
            onChange={(event) => setDepartureValue(event.target.value)}
            value={departureValue}
          />
        </div>
        <button className="search-bar__submit button button--primary" type="submit">
          <span className="search-bar__submit-label">See available rooms</span>
        </button>
      </form>

      {dateError ? (
        <p className="form-message form-message--error hero-atmosphere__message" role="alert">
          Check-out must be after check-in. Choose a stay between 1 and 21 nights, starting
          from today.
        </p>
      ) : null}
    </section>
  );
}
