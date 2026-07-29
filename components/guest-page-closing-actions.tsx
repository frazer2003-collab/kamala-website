import Link from "next/link";

/**
 * Shared closing CTA for guest content pages (gallery, location, contact).
 * Native /#dates anchor so cross-page hash scroll lands on the home date search.
 */
export function GuestPageClosingActions() {
  return (
    <div className="guest-page__actions">
      <Link className="button button--secondary" href="/">
        Back to home
      </Link>
      <a className="button button--primary" href="/#dates">
        Check dates
      </a>
    </div>
  );
}
