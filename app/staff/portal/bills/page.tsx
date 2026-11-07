import Link from "next/link";
import { StaffDeskBills } from "@/components/staff-desk-bills";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import {
  listDeskBills,
  listDeskCountedItems,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { redirect } from "next/navigation";
import "@/app/staff-desk.css";
import "@/app/staff-ops.css";

export const dynamic = "force-dynamic";

export default async function PortalBillsPage() {
  const portal = await getDeskPortalSession();
  if (!portal || portal.kind !== "bills") {
    redirect("/staff/portal/login?portal=bills");
  }
  const locale = await getStaffLocale();
  const [bills, sellables, countedItems] = await Promise.all([
    listDeskBills(),
    listDeskSellables(),
    listDeskCountedItems(),
  ]);

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffPortalShell kind="bills">
        <section className="staff-main staff-desk" aria-labelledby="portal-bills-title">
          <header className="staff-header staff-header--compact staff-desk__header">
            <div>
              <h1 id="portal-bills-title">Bills</h1>
              <p>Open tabs, add menu or stock items, then clear when paid.</p>
            </div>
            <Link className="button button--primary" href="/staff/portal/bills/new">
              New bill
            </Link>
          </header>
          <StaffDeskBills
            bills={bills}
            countedItems={countedItems}
            newBillHref="/staff/portal/bills/new"
            returnTo="/staff/portal/bills"
            sellables={sellables}
          />
        </section>
      </StaffPortalShell>
    </StaffLocaleProvider>
  );
}
