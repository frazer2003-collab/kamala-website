import { StaffDeskStock } from "@/components/staff-desk-stock";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskCountedItems,
  listDeskSellables,
  listDeskStockMovements,
} from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffStockPage() {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const [items, sellables, movements] = await Promise.all([
    listDeskCountedItems(),
    listDeskSellables(),
    listDeskStockMovements(),
  ]);

  return (
    <StaffShell current="stock">
      <section className="staff-main staff-desk" aria-labelledby="desk-stock-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-stock-title">{staffT(locale, "stock.title")}</h1>
            <p>{staffT(locale, "stock.intro")}</p>
          </div>
        </header>
        <StaffDeskStock items={items} movements={movements} sellables={sellables} />
      </section>
    </StaffShell>
  );
}
