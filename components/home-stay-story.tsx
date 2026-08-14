import Link from "next/link";
import {
  buildStayStoryCheckInDetails,
  buildStayStoryHeading,
  buildStayStoryLede,
  getGuesthouseLocationLabel,
  isNearThaPhaeGate,
} from "@/lib/home-hero-copy";
import { THAE_PHAE_GATE_NAME } from "@/lib/tha-phae-seo";

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
  const heading = buildStayStoryHeading(locationLabel, addressLine);
  const lede = buildStayStoryLede(propertyName, locationLabel, addressLine);
  const visibleHouseRules = houseRules.filter(
    (rule) => !/breakfast/i.test(rule),
  );
  const checkInDetails = buildStayStoryCheckInDetails(
    houseRules,
    checkInFrom,
    checkInUntil,
  );

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
          <p className="stay-story__details">{checkInDetails}</p>
          <p className="stay-story__link-row">
            <Link className="stay-story__gallery-link" href="/location">
              {isNearThaPhaeGate(addressLine)
                ? `Location near ${THAE_PHAE_GATE_NAME} →`
                : "Find us on the map →"}
            </Link>
            {" · "}
            <Link className="stay-story__gallery-link" href="/gallery">
              View the garden →
            </Link>
          </p>
        </div>
        {visibleHouseRules.length > 0 ? (
          <aside className="stay-story__aside" aria-labelledby="stay-rules-title">
            <h3 id="stay-rules-title">House rules</h3>
            <ul>
              {visibleHouseRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
