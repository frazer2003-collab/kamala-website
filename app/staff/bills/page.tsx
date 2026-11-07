import { StaffDeskBills } from "@/components/staff-desk-bills";
import { StaffDeskRangeBand } from "@/components/staff-desk-range-band";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskBillsInRange,
  listDeskCountedItems,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { deskListReturnTo, parseDeskListRange } from "@/lib/desk-range";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffBillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    open?: string;
    month?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const { fromIso, toIso, monthKey, todayIso } = parseDeskListRange(params);
  const returnTo = deskListReturnTo("/staff/bills", fromIso, toIso, monthKey);

  const [bills, sellables, countedItems] = hasStaffSupabaseConfig()
    ? await Promise.all([
        listDeskBillsInRange(fromIso, toIso),
        listDeskSellables(),
        listDeskCountedItems(),
      ])
    : [[], [], []];

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk staff-desk--fill" aria-labelledby="desk-bills-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-bills-title">{staffT(locale, "bills.title")}</h1>
          </div>
        </header>

        <StaffDeskRangeBand
          fromIso={fromIso}
          locale={locale}
          monthKey={monthKey}
          pathname="/staff/bills"
          toIso={toIso}
          todayIso={todayIso}
        />

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffDeskBills
            bills={bills}
            countedItems={countedItems}
            fromIso={fromIso}
            initialOpenId={params.open ?? null}
            returnTo={returnTo}
            sellables={sellables}
            toIso={toIso}
          />
        )}
      </section>
    </StaffShell>
  );
}
