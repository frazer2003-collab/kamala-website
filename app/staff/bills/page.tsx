import Link from "next/link";
import { StaffDeskBills } from "@/components/staff-desk-bills";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskBills,
  listDeskCountedItems,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffBillsPage() {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const [bills, sellables, countedItems] = await Promise.all([
    listDeskBills(),
    listDeskSellables(),
    listDeskCountedItems(),
  ]);

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk" aria-labelledby="desk-bills-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-bills-title">{staffT(locale, "bills.title")}</h1>
            <p>{staffT(locale, "bills.intro")}</p>
          </div>
          <Link className="button button--primary" href="/staff/bills/new">
            {staffT(locale, "bills.new")}
          </Link>
        </header>

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffDeskBills
            bills={bills}
            countedItems={countedItems}
            sellables={sellables}
          />
        )}
      </section>
    </StaffShell>
  );
}
