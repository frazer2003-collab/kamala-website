import Link from "next/link";
import {
  buildStayStoryHeading,
  buildStayStoryLede,
  getGuesthouseLocationLabel,
} from "@/lib/home-hero-copy";

type HomeStayStoryProps = {
  propertyName: string;
  propertyTagline: string;
  addressLine: string | null;
  checkInFrom: string;
  checkInUntil: string;
  houseRules: string[];
};

export function HomeStayStory({
  propertyName,
  addressLine,
  checkInFrom,
  checkInUntil,
  houseRules,
}: HomeStayStoryProps) {
  const locationLabel = getGuesthouseLocationLabel(addressLine, propertyName);
  const heading = buildStayStoryHeading(locationLabel);
  const lede = buildStayStoryLede(propertyName, locationLabel, addressLine);

  return (
    <section
      className="section section--stay-story"
      aria-labelledby="stay-story-title"
      id="about"
    >
      <div className="stay-story stay-story--split">
        <div className="stay-story__main">
          <h2 id="stay-story-title">{heading}</h2>
          <p className="stay-story__lede">{lede}</p>
          <p className="stay-story__details">
            Check in from {checkInFrom} to {checkInUntil}. After you reserve a room, we
            reply by email to confirm your stay and send arrival details.
          </p>
          <p className="stay-story__link-row">
            <Link className="stay-story__gallery-link" href="/gallery">
              View the garden →
            </Link>
          </p>
        </div>
        {houseRules.length > 0 ? (
          <aside className="stay-story__aside" aria-labelledby="stay-rules-title">
            <h3 id="stay-rules-title">House rules</h3>
            <ul>
              {houseRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
