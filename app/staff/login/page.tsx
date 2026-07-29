import Link from "next/link";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffLoginForm } from "@/components/staff-login-form";
import { hasStaffAuthConfig } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    next?.startsWith("/staff") && !next.startsWith("/staff/login") ? next : "/staff";

  return (
    <StaffBusyRoot>
      <main className="staff-login-shell">
        <section className="staff-login-panel" aria-labelledby="staff-login-title">
          <Link className="brand brand--compact" href="/">
            <span className="brand__mark" aria-hidden="true">
              K
            </span>
            <span>
              <strong>Kamala</strong>
              <small>Staff</small>
            </span>
          </Link>

          <h1 id="staff-login-title">Sign in</h1>

          <StaffLoginForm configured={hasStaffAuthConfig()} nextPath={nextPath} />
        </section>
      </main>
    </StaffBusyRoot>
  );
}
