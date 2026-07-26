export default function StaffLoading() {
  return (
    <main className="staff-shell staff-shell--loading" aria-busy="true" aria-label="Loading staff">
      <aside className="staff-sidebar" aria-hidden="true">
        <div className="skeleton-block skeleton-block--brand" />
        <div className="staff-nav staff-nav--skeleton">
          <div className="skeleton-line skeleton-line--medium" />
          <div className="skeleton-line skeleton-line--medium" />
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      </aside>
      <section className="staff-main staff-main--loading">
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-title" />
        <div className="skeleton-block skeleton-block--board" />
        <p className="staff-loading-copy" role="status">
          Loading…
        </p>
      </section>
    </main>
  );
}
