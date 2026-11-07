import Link from "next/link";
import { loginDeskPortal } from "@/app/staff/portal-actions";
import { StaffBusyRoot } from "@/components/staff-busy";
import { hasStaffAuthConfig } from "@/lib/staff-auth";
import "@/app/staff-passcode.css";

export const dynamic = "force-dynamic";

export default async function DeskPortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const portal = params.portal === "laundry" ? "laundry" : "bills";
  const nextPath =
    params.next?.startsWith(`/staff/portal/${portal}`)
      ? params.next
      : `/staff/portal/${portal}`;

  return (
    <StaffBusyRoot>
      <main className="staff-login-shell">
        <section className="staff-login-panel" aria-labelledby="portal-login-title">
          <Link className="brand brand--compact" href="/">
            <span className="brand__mark" aria-hidden="true">
              K
            </span>
            <span>
              <strong>Kamala</strong>
              <small>Desk portal</small>
            </span>
          </Link>

          <h1 id="portal-login-title">
            {portal === "laundry" ? "Laundry portal" : "Bills portal"}
          </h1>
          <p className="staff-login-note">
            Sign in with the desk portal passcode. Full staff tools stay on the
            main staff login.
          </p>

          {!hasStaffAuthConfig() ? (
            <p className="form-message form-message--setup" role="status">
              Staff auth is not configured yet.
            </p>
          ) : (
            <form action={loginDeskPortal} className="staff-login-form">
              <input name="portal" type="hidden" value={portal} />
              <input name="next" type="hidden" value={nextPath} />
              <div className="field-pair">
                <label htmlFor="portal-passcode">Passcode</label>
                <input
                  autoComplete="current-password"
                  id="portal-passcode"
                  name="passcode"
                  required
                  type="password"
                />
              </div>
              {params.error === "passcode" ? (
                <p className="form-message form-message--error" role="alert">
                  That passcode did not match. Try again.
                </p>
              ) : null}
              <button className="button button--primary" type="submit">
                Open {portal === "laundry" ? "laundry" : "bills"}
              </button>
            </form>
          )}

          <p className="staff-login-note">
            <Link href={`/staff/portal/login?portal=${portal === "bills" ? "laundry" : "bills"}`}>
              Switch to {portal === "bills" ? "laundry" : "bills"} portal
            </Link>
            {" · "}
            <Link href="/staff/login">Full staff login</Link>
          </p>
        </section>
      </main>
    </StaffBusyRoot>
  );
}
