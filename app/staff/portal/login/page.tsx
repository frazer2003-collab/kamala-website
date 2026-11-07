import Link from "next/link";
import { loginDeskPortal } from "@/app/staff/portal-actions";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { hasStaffAuthConfig } from "@/lib/staff-auth";
import { staffT } from "@/lib/staff-i18n";
import { getStaffLocale } from "@/lib/staff-locale-server";
import "@/app/staff-passcode.css";

export const dynamic = "force-dynamic";

export default async function DeskPortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const locale = await getStaffLocale();
  const portal = params.portal === "laundry" ? "laundry" : "bills";
  const nextPath =
    params.next?.startsWith(`/staff/portal/${portal}`)
      ? params.next
      : `/staff/portal/${portal}`;

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffBusyRoot>
        <main className="staff-login-shell">
          <section className="staff-login-panel" aria-labelledby="portal-login-title">
            <Link className="brand brand--compact" href="/">
              <span className="brand__mark" aria-hidden="true">
                K
              </span>
              <span>
                <strong>Kamala</strong>
                <small>{staffT(locale, "portal.deskPortal")}</small>
              </span>
            </Link>

            <h1 id="portal-login-title">
              {portal === "laundry"
                ? staffT(locale, "portal.laundryTitle")
                : staffT(locale, "portal.billsTitle")}
            </h1>
            <p className="staff-login-note">{staffT(locale, "portal.signInNote")}</p>

            {!hasStaffAuthConfig() ? (
              <p className="form-message form-message--setup" role="status">
                {staffT(locale, "portal.authNotConfigured")}
              </p>
            ) : (
              <form action={loginDeskPortal} className="staff-login-form">
                <input name="portal" type="hidden" value={portal} />
                <input name="next" type="hidden" value={nextPath} />
                <div className="field-pair">
                  <label htmlFor="portal-passcode">
                    {staffT(locale, "portal.passcode")}
                  </label>
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
                    {staffT(locale, "portal.passcodeMismatch")}
                  </p>
                ) : null}
                <button className="button button--primary" type="submit">
                  {portal === "laundry"
                    ? staffT(locale, "portal.openLaundry")
                    : staffT(locale, "portal.openBills")}
                </button>
              </form>
            )}

            <p className="staff-login-note">
              <Link
                href={`/staff/portal/login?portal=${portal === "bills" ? "laundry" : "bills"}`}
              >
                {portal === "bills"
                  ? staffT(locale, "portal.switchToLaundry")
                  : staffT(locale, "portal.switchToBills")}
              </Link>
              {" · "}
              <Link href="/staff/login">
                {staffT(locale, "portal.fullStaffLogin")}
              </Link>
            </p>
          </section>
        </main>
      </StaffBusyRoot>
    </StaffLocaleProvider>
  );
}
