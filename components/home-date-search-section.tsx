import { Suspense } from "react";
import { HomeDateSearch } from "@/components/home-date-search";
import { HomeHeroIntro } from "@/components/home-hero-intro";

type HomeDateSearchSectionProps = {
  arrival?: string;
  departure?: string;
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
  dateError?: boolean;
};

export function HomeDateSearchSection({
  arrival,
  departure,
  propertyName,
  propertyTagline,
  addressLine,
  dateError,
}: HomeDateSearchSectionProps) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="hero-atmosphere"
      id="dates"
    >
      <HomeHeroIntro
        addressLine={addressLine}
        propertyName={propertyName}
        propertyTagline={propertyTagline}
      />
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="hero-atmosphere__skeleton hero-atmosphere__skeleton--search"
          />
        }
      >
        <HomeDateSearch
          arrival={arrival}
          dateError={dateError}
          departure={departure}
        />
      </Suspense>
    </section>
  );
}
