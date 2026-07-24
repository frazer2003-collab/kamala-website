"use client";

import { Suspense } from "react";
import { HomeDateSearch } from "@/components/home-date-search";

type HomeDateSearchSectionProps = {
  arrival?: string;
  departure?: string;
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
  dateError?: boolean;
};

export function HomeDateSearchSection(props: HomeDateSearchSectionProps) {
  return (
    <Suspense
      fallback={
        <section
          aria-hidden="true"
          className="hero-atmosphere hero-atmosphere--loading"
          id="dates"
        >
          <div className="hero-atmosphere__copy">
            <div className="hero-atmosphere__skeleton hero-atmosphere__skeleton--brand" />
            <div className="hero-atmosphere__skeleton hero-atmosphere__skeleton--title" />
            <div className="hero-atmosphere__skeleton hero-atmosphere__skeleton--lede" />
          </div>
          <div className="hero-atmosphere__skeleton hero-atmosphere__skeleton--search" />
        </section>
      }
    >
      <HomeDateSearch {...props} />
    </Suspense>
  );
}
