"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { PropertyLocation } from "@/components/property-location";
import { getPropertyTodayIso } from "@/lib/calendar";

type HomeDateSearchProps = {
  arrival?: string;
  departure?: string;
  propertyName: string;
  addressLine: string | null;
  contactPhone: string | null;
  dateError?: boolean;
  showLocationMap?: boolean;
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
        onKeyDown={(event) => {
          if (
            event.key === "Tab" ||
            event.key === "Escape" ||
            event.key.startsWith("Arrow")
          ) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker(event.currentTarget);
          } else {
            event.preventDefault();
          }
        }}
        onPaste={(event) => event.preventDefault()}
        required
        type="date"
        value={value}
      />
      <span aria-hidden="true" className="search-bar__value">
        {value ? formatSegmentDate(value) : "Add dates"}
      </span>
    </label>
  );
}

export function HomeDateSearch({
  arrival,
  departure,
  propertyName,
  addressLine,
  contactPhone,
  dateError,
  showLocationMap = true,
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
    <section className="hero-search" aria-labelledby={`${formId}-title`}>
      <div className="hero-search__intro">
        <h1 id={`${formId}-title`}>Book your stay at {propertyName}</h1>
        <p className="hero-search__lede">
          Choose your dates to see which rooms are free.
        </p>
        <PropertyLocation
          addressLine={addressLine}
          contactPhone={contactPhone}
          showMap={showLocationMap}
        />
      </div>

      <form className="search-bar" onSubmit={handleSubmit}>
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
          <span className="search-bar__submit-label">Search</span>
          <span aria-hidden="true" className="search-bar__submit-icon">
            ⌕
          </span>
        </button>
      </form>

      {dateError ? (
        <p className="form-message form-message--error hero-search__message" role="alert">
          Choose valid future dates with a stay between 1 and 21 nights.
        </p>
      ) : null}
    </section>
  );
}
