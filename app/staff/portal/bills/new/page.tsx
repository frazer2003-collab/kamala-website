import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import { StaffStartOpenBill } from "@/components/staff-start-open-bill";
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

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffPortalShell kind="bills">
        <section className="staff-main staff-desk">
          <StaffStartOpenBill returnTo="/staff/portal/bills" />
        </section>
      </StaffPortalShell>
    </StaffLocaleProvider>
  );
}
