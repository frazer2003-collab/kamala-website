import { StaffDeskCatalog } from "@/components/staff-desk-catalog";
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
      <section className="staff-main staff-desk staff-desk--fill" aria-labelledby="desk-items-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-items-title">{staffT(locale, "items.title")}</h1>
          </div>
        </header>

        <StaffDeskCatalog
          categories={categories}
          countedItems={countedItems}
          initialCategory={params.category ?? ""}
          initialOpenId={params.open ?? null}
          initialQuery={params.q ?? ""}
          movements={movements}
          sellables={sellables}
        />
      </section>
    </StaffShell>
  );
}
