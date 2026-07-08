"use client";

import { Suspense } from "react";
import { HomeDateSearch } from "@/components/home-date-search";

type HomeDateSearchSectionProps = {
  arrival?: string;
  departure?: string;
  propertyName: string;
  addressLine: string | null;
  contactPhone: string | null;
  dateError?: boolean;
  showLocationMap?: boolean;
};

export function HomeDateSearchSection(props: HomeDateSearchSectionProps) {
  return (
    <Suspense fallback={<div className="hero-search hero-search--loading" aria-hidden="true" />}>
      <HomeDateSearch {...props} />
    </Suspense>
  );
}
