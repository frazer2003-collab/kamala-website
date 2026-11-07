import { StaffDeskExpenses } from "@/components/staff-desk-expenses";
import { StaffDeskRangeBand } from "@/components/staff-desk-range-band";
import { StaffShell } from "@/components/staff-shell";
import { listDeskExpensesInRange } from "@/lib/desk-ops-data";
import { deskListReturnTo, parseDeskListRange } from "@/lib/desk-range";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
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
  const returnTo = deskListReturnTo("/staff/expenses", fromIso, toIso, monthKey);
  const expenseRange = hasStaffSupabaseConfig()
    ? await listDeskExpensesInRange(fromIso, toIso)
    : { expenses: [], truncated: false, totalSatang: 0, count: 0 };
  const { expenses, truncated, totalSatang } = expenseRange;

  return (
    <StaffShell current="expenses">
      <section className="staff-main staff-desk staff-desk--fill" aria-labelledby="desk-expenses-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-expenses-title">{staffT(locale, "expenses.title")}</h1>
          </div>
        </header>

        <StaffDeskRangeBand
          fromIso={fromIso}
          locale={locale}
          monthKey={monthKey}
          pathname="/staff/expenses"
          toIso={toIso}
          todayIso={todayIso}
        />

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffDeskExpenses
            expenses={expenses}
            fromIso={fromIso}
            returnTo={returnTo}
            toIso={toIso}
            todayIso={todayIso}
            totalSatang={totalSatang}
            truncated={truncated}
          />
        )}
      </section>
    </StaffShell>
  );
}
