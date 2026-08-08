import Link from "next/link";
import { StaffBusyRoot } from "@/components/staff-busy";
import { StaffPasscodeForm } from "@/components/staff-passcode-form";
import { StaffSessionIdleGuard } from "@/components/staff-session-idle";
import {
  hasStaffSensitiveUnlock,
  requireStaffCalendarWrite,
} from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import "@/app/staff-passcode.css";

export const dynamic = "force-dynamic";

function safeNextPath(next: string | undefined) {
  if (
    next?.startsWith("/staff/") &&
    !next.startsWith("/staff/login") &&
    !next.startsWith("/staff/passcode")
  ) {
    return next;
  }
  return "/staff/sold";
}

export default async function StaffPasscodePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await requireStaffCalendarWrite();

  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  if (await hasStaffSensitiveUnlock()) {
    redirect(nextPath);
  }

  return (
    <StaffBusyRoot>
      <main className="staff-login-shell">
        <section
          className="staff-login-panel"
          aria-labelledby="staff-passcode-title"
        >
          <Link className="brand brand--compact" href="/staff">
            <span className="brand__mark" aria-hidden="true">
              K
            </span>
            <span>
              <strong>Kamala</strong>
              <small>Staff</small>
            </span>
          </Link>

          <h1 id="staff-passcode-title">Enter passcode</h1>
          <p className="staff-passcode-lead">
            Finance and settings need a short passcode before you continue.
          </p>

          <StaffPasscodeForm nextPath={nextPath} />
        </section>
      </main>
      <StaffSessionIdleGuard />
    </StaffBusyRoot>
  );
}
