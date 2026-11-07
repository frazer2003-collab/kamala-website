import { StaffDeskLaundry } from "@/components/staff-desk-laundry";
import { StaffLocaleProvider } from "@/components/staff-locale";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import { listDeskLaundry } from "@/lib/desk-ops-data";
import { getDeskPortalSession } from "@/lib/desk-portal";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { redirect } from "next/navigation";
import "@/app/staff-desk.css";
import "@/app/staff-ops.css";

export const dynamic = "force-dynamic";

export default async function PortalLaundryPage() {
  const portal = await getDeskPortalSession();
  if (!portal || portal.kind !== "laundry") {
    redirect("/staff/portal/login?portal=laundry");
  }
  const locale = await getStaffLocale();
  const records = await listDeskLaundry();

  return (
    <StaffLocaleProvider locale={locale}>
      <StaffPortalShell kind="laundry">
        <section className="staff-main staff-desk staff-desk--fill" aria-labelledby="portal-laundry-title">
          <header className="staff-header staff-header--compact staff-desk__header">
            <div>
              <h1 id="portal-laundry-title">{staffT(locale, "laundry.title")}</h1>
            </div>
          </header>
          <StaffDeskLaundry
            records={records}
            returnTo="/staff/portal/laundry"
            sheetsOnly
          />
        </section>
      </StaffPortalShell>
    </StaffLocaleProvider>
  );
}
