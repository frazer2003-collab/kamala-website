import Link from "next/link";
import { StaffDeskLaundry } from "@/components/staff-desk-laundry";
import { StaffShell } from "@/components/staff-shell";
import { listDeskLaundry } from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffLaundryPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const { open } = await searchParams;
  const records = await listDeskLaundry();

  return (
    <StaffShell current="laundry">
      <section className="staff-main staff-desk" aria-labelledby="desk-laundry-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-laundry-title">{staffT(locale, "laundry.title")}</h1>
            <p>{staffT(locale, "laundry.intro")}</p>
          </div>
          <Link className="button button--quiet" href="/staff/expenses?view=day">
            {staffT(locale, "laundry.expenseHint")}
          </Link>
        </header>
        <StaffDeskLaundry initialOpenId={open ?? null} records={records} />
      </section>
    </StaffShell>
  );
}
