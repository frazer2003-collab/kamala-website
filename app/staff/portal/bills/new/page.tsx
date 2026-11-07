import Link from "next/link";
import { createBill } from "@/app/desk-actions";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffNewBillForm } from "@/components/staff-new-bill-form";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import { listDeskSellables } from "@/lib/desk-ops-data";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { redirect } from "next/navigation";
import "@/app/staff-desk.css";
import "@/app/staff-ops.css";

export const dynamic = "force-dynamic";

export default async function PortalNewBillPage() {
  const portal = await getDeskPortalSession();
  if (!portal || portal.kind !== "bills") {
    redirect("/staff/portal/login?portal=bills");
  }
  const locale = await getStaffLocale();
  const sellables = (await listDeskSellables()).filter((item) => item.active);

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffPortalShell kind="bills">
        <section className="staff-main staff-desk" aria-labelledby="portal-new-bill-title">
          <header className="staff-header staff-header--compact staff-desk__header">
            <div>
              <h1 id="portal-new-bill-title">New bill</h1>
              <p>Name the tab and optionally add its first item.</p>
            </div>
            <Link className="button button--secondary" href="/staff/portal/bills">
              Back
            </Link>
          </header>
          <StaffNewBillForm
            action={createBill}
            returnTo="/staff/portal/bills"
            sellables={sellables}
          />
        </section>
      </StaffPortalShell>
    </StaffLocaleProvider>
  );
}
