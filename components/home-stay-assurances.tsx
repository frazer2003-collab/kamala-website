type HomeStayAssurancesProps = {
  checkInFrom: string;
};

/**
 * Quiet front-desk facts — not amenity icon cards (DESIGN.md anti-pattern).
 * Breakfast, direct booking, check-in time, and confirmation cadence.
 */
export function HomeStayAssurances({ checkInFrom }: HomeStayAssurancesProps) {
  return (
    <section className="home-stay-assurances" aria-label="Stay facts">
      <ul className="home-stay-assurances-list">
        <li>Breakfast included</li>
        <li>Book directly with us</li>
        <li>Check-in from {checkInFrom}</li>
        <li>We confirm by email</li>
      </ul>
    </section>
  );
}
