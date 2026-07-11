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
        <div className="hero-atmosphere hero-atmosphere--loading" aria-hidden="true" />
      }
    >
      <HomeDateSearch {...props} />
    </Suspense>
  );
}
