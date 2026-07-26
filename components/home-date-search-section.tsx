import { Suspense } from "react";
import { HomeDateSearch } from "@/components/home-date-search";
import { HomeHeroIntro, HomeHeroLede } from "@/components/home-hero-intro";

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
      className="hero-atmosphere hero-atmosphere--dates-first"
      id="dates"
    >
      <HomeHeroIntro addressLine={addressLine} propertyName={propertyName} />
      <div className="hero-atmosphere__search">
        <p className="hero-atmosphere__search-label" id="home-dates-label">
          Check dates for your stay
        </p>
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
      </div>
      <HomeHeroLede
        addressLine={addressLine}
        propertyName={propertyName}
        propertyTagline={propertyTagline}
      />
    </section>
  );
}
