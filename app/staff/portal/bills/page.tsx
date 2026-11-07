import { StaffDeskBills } from "@/components/staff-desk-bills";
import { StaffDeskRangeBand } from "@/components/staff-desk-range-band";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import {
  listDeskBillsInRange,
  listDeskCountedItems,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { deskListReturnTo, parseDeskListRange } from "@/lib/desk-range";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { redirect } from "next/navigation";
import "@/app/staff-desk.css";
import "@/app/staff-ops.css";

export const dynamic = "force-dynamic";

export default async function PortalBillsPage({
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
  const portal = await getDeskPortalSession();
  if (!portal || portal.kind !== "bills") {
    redirect("/staff/portal/login?portal=bills");
  }
  const locale = await getStaffLocale();
  const params = await searchParams;
  const { fromIso, toIso, monthKey, todayIso } = parseDeskListRange(params);
  const returnTo = deskListReturnTo(
    "/staff/portal/bills",
    fromIso,
    toIso,
    monthKey,
  );
  const [bills, sellables, countedItems] = await Promise.all([
    listDeskBillsInRange(fromIso, toIso),
    listDeskSellables(),
    listDeskCountedItems(),
  ]);

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffPortalShell kind="bills">
        <section className="staff-main staff-desk staff-desk--fill" aria-labelledby="portal-bills-title">
          <header className="staff-header staff-header--compact staff-desk__header">
            <div>
              <h1 id="portal-bills-title">{staffT(locale, "bills.title")}</h1>
            </div>
          </header>
          <StaffDeskRangeBand
            fromIso={fromIso}
            locale={locale}
            monthKey={monthKey}
            pathname="/staff/portal/bills"
            toIso={toIso}
            todayIso={todayIso}
          />
          <StaffDeskBills
            bills={bills}
            countedItems={countedItems}
            fromIso={fromIso}
            initialOpenId={params.open ?? null}
            returnTo={returnTo}
            sellables={sellables}
            toIso={toIso}
          />
        </section>
      </StaffPortalShell>
    </StaffLocaleProvider>
  );
}
