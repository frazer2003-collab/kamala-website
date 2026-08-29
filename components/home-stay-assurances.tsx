const GUEST_BENEFITS = [
  { accent: "Best rate", rest: "guarantee", detail: "when you book direct" },
  { accent: "Flexible", rest: "cancellation", detail: "if your plans shift" },
  { accent: "Free", rest: "luggage storage", detail: "before and after your stay" },
  { accent: "Scooter", rest: "rental", detail: "available on site" },
  { accent: "Discounted", rest: "tours", detail: "local picks at guest rates" },
] as const;

/**
 * Guest perks at the counter — display-serif phrases with maroon lead words.
 * Not amenity icon cards (DESIGN.md anti-pattern).
 */
export function HomeStayAssurances() {
  return (
    <section className="home-stay-assurances" aria-label="Guest benefits">
      <ul className="home-stay-assurances-list">
        {GUEST_BENEFITS.map(({ accent, rest, detail }) => (
          <li key={`${accent}-${rest}`}>
            <p className="home-stay-assurances-phrase">
              <span className="home-stay-assurances-accent">{accent}</span>{" "}
              <span className="home-stay-assurances-rest">{rest}</span>
            </p>
            <p className="home-stay-assurances-detail">{detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
