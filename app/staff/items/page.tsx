import { StaffDeskItems } from "@/components/staff-desk-items";
import { StaffDeskStock } from "@/components/staff-desk-stock";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskCountedItems,
  listDeskItemCategories,
  listDeskSellables,
  listDeskStockMovements,
} from "@/lib/desk-ops-data";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; open?: string }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const [sellables, countedItems, categories, movements] = await Promise.all([
    listDeskSellables(),
    listDeskCountedItems(),
    listDeskItemCategories(),
    listDeskStockMovements(),
  ]);

  return (
    <StaffShell current="items">
      <section className="staff-main staff-desk" aria-labelledby="desk-items-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-items-title">{staffT(locale, "items.title")}</h1>
            <p>{staffT(locale, "items.intro")}</p>
          </div>
        </header>

        <div className="staff-desk__section">
          <h2 className="staff-desk__section-title">{staffT(locale, "items.catalog")}</h2>
          <StaffDeskItems
            categories={categories}
            countedItems={countedItems}
            initialCategory={params.category ?? ""}
            initialQuery={params.q ?? ""}
            sellables={sellables}
          />
        </div>

        <div className="staff-desk__section">
          <h2 className="staff-desk__section-title">{staffT(locale, "stock.title")}</h2>
          <StaffDeskStock
            initialOpenId={params.open ?? null}
            items={countedItems}
            movements={movements}
            sellables={sellables}
          />
        </div>
      </section>
    </StaffShell>
  );
}
