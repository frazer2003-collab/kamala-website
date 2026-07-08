export default function Loading() {
  return (
    <main className="site-shell" aria-label="Loading guesthouse rooms">
      <div className="topbar skeleton-block skeleton-block--top" />
      <section className="hero">
        <div>
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--medium" />
        </div>
        <div className="arrival-card">
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--medium" />
        </div>
      </section>
    </main>
  );
}
