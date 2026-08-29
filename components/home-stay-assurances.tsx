const GUEST_BENEFITS = [
  { phrase: "Best rate guarantee", detail: "when you book direct" },
  { phrase: "Flexible cancellation", detail: "if your plans shift" },
  { phrase: "Free luggage storage", detail: "before and after your stay" },
  { phrase: "Scooter rental", detail: "available on site" },
  { phrase: "Discounted tours", detail: "local picks at guest rates" },
] as const;

/**
 * Quiet front-desk perks — not amenity icon cards (DESIGN.md anti-pattern).
 * Key phrases carry the promise; detail lines stay secondary.
 */
export function HomeStayAssurances() {
  return (
    <section className="home-stay-assurances" aria-label="Guest benefits">
      <ul className="home-stay-assurances-list">
        {GUEST_BENEFITS.map(({ phrase, detail }) => (
          <li key={phrase}>
            <span className="home-stay-assurances-phrase">{phrase}</span>
            <span className="home-stay-assurances-detail">{detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
