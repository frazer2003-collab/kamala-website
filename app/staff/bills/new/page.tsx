import Link from "next/link";
import { createBill } from "@/app/desk-actions";
import { StaffNewBillForm } from "@/components/staff-new-bill-form";
import { StaffShell } from "@/components/staff-shell";
import { listDeskSellables } from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function NewStaffBillPage() {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const sellables = (await listDeskSellables()).filter((item) => item.active);

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk" aria-labelledby="new-bill-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="new-bill-title">{staffT(locale, "bills.new")}</h1>
            <p>Name the tab and optionally add its first item.</p>
          </div>
          <Link className="button button--secondary" href="/staff/bills">
            {staffT(locale, "nav.bills")}
          </Link>
        </header>

        <StaffNewBillForm action={createBill} sellables={sellables} />
      </section>
    </StaffShell>
  );
}
