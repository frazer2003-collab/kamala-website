import Link from "next/link";

/** Shared closing CTA for guest content pages (gallery, location, contact). */
export function GuestPageClosingActions() {
  return (
    <div className="guest-page__actions">
      <Link className="button button--primary" href="/">
        Back to home
      </Link>
    </div>
  );
}
