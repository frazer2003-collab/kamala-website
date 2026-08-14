/**
 * Quiet front-desk facts — not amenity icon cards (DESIGN.md anti-pattern).
 * Direct booking, check-out time, and confirmation cadence.
 */
export function HomeStayAssurances() {
  return (
    <section className="home-stay-assurances" aria-label="Stay facts">
      <ul className="home-stay-assurances-list">
        <li>Book directly with us</li>
        <li>Check-out by 2:00 pm</li>
        <li>We confirm by email</li>
      </ul>
    </section>
  );
}
