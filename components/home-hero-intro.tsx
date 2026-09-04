import {
  buildAtmosphereHeadline,
  buildAtmosphereLede,
  getGuesthouseLocationLabel,
} from "@/lib/home-hero-copy";

type HomeHeroIntroProps = {
  propertyName: string;
  addressLine: string | null;
};

type HomeHeroLedeProps = {
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
};

/**
 * Server-rendered hero brand + H1 so SEO crawlers see the headline in the
 * initial HTML (not gated behind the client Suspense date search).
 */
export function HomeHeroIntro({ propertyName, addressLine }: HomeHeroIntroProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const headline = buildAtmosphereHeadline(locationLabel, propertyName, addressLine);

  return (
    <div className="hero-atmosphere__copy">
      <p className="hero-atmosphere__brand">
        <span className="hero-atmosphere__property">{propertyName}</span>
      </p>
      <h1 id="home-hero-title">{headline}</h1>
    </div>
  );
}

/** Supporting hero sentence — sits under the H1, above the date search. */
export function HomeHeroLede({
  propertyName,
  propertyTagline,
  addressLine,
}: HomeHeroLedeProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const lede = buildAtmosphereLede(locationLabel, propertyTagline, addressLine);

  return <p className="hero-atmosphere__lede">{lede}</p>;
}
