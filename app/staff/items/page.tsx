import Link from "next/link";
import { saveSellableItem } from "@/app/desk-actions";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskCountedItems,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import {
  bilingualItemLabel,
  DESK_SELLABLE_CATEGORIES,
} from "@/lib/desk-items";
import { formatSatang, satangToBaht } from "@/lib/desk-money";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; category?: string }>;
}) {
  await requireStaffSession();
  const params = await searchParams;
  const [sellables, countedItems] = await Promise.all([
    listDeskSellables(),
    listDeskCountedItems(),
  ]);
  const query = (params.q ?? "").trim().toLowerCase();
  const category = DESK_SELLABLE_CATEGORIES.includes(
    params.category as (typeof DESK_SELLABLE_CATEGORIES)[number],
  )
    ? params.category
    : "";
  const visible = sellables.filter(
    (item) =>
      (!category || item.category === category) &&
      (!query ||
        item.nameEn.toLowerCase().includes(query) ||
        item.nameTh.toLowerCase().includes(query)),
  );
  const editing = sellables.find((item) => item.id === params.edit) ?? null;
  const laundryItems = sellables.filter(
    (item) => item.category === "laundry" && item.active,
  );
  const ingredientMap = new Map(
    editing?.ingredients.map((ingredient) => [
      ingredient.countedItemId,
      ingredient.quantity,
    ]) ?? [],
  );

  return (
    <StaffShell current="items">
      <section className="staff-main staff-desk" aria-labelledby="desk-items-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-items-title">Items</h1>
            <p>Prices are entered in baht and stored as satang. Recipes drive stock when bills clear.</p>
          </div>
        </header>

        <form action="/staff/items" className="staff-desk__filter" method="get">
          <div className="field-pair staff-desk__grow">
            <label htmlFor="items-q">Find</label>
            <input defaultValue={params.q} id="items-q" name="q" placeholder="Thai or English name" type="search" />
          </div>
          <div className="field-pair">
            <label htmlFor="items-category">Category</label>
            <select defaultValue={category} id="items-category" name="category">
              <option value="">All categories</option>
              {DESK_SELLABLE_CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}
            </select>
          </div>
          <button className="button button--secondary" type="submit">Filter</button>
          <Link className="button button--quiet" href="/staff/items">New item</Link>
        </form>

        <div className="staff-desk__workspace">
          <section className="staff-desk__panel" aria-labelledby="catalog-title">
            <header className="staff-desk__panel-head"><h2 id="catalog-title">Catalog</h2><span>{visible.length} items</span></header>
            <div className="staff-desk__table-wrap">
              <table className="staff-desk__table">
                <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Recipe</th><th>Status</th></tr></thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td><Link href={`/staff/items?edit=${item.id}`}>{bilingualItemLabel(item)}</Link></td>
                      <td>{item.category}</td>
                      <td>{formatSatang(item.priceSatang)}</td>
                      <td>{item.ingredients.length || "-"}</td>
                      <td><span className={`desk-status desk-status--${item.active ? "open" : "cleared"}`}>{item.active ? "active" : "inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form action={saveSellableItem} className="staff-desk__form">
            <h2>{editing ? "Edit item" : "Create item"}</h2>
            {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
            <div className="staff-desk__field-grid">
              <div className="field-pair">
                <label htmlFor="item-name-th">Thai name</label>
                <input defaultValue={editing?.nameTh} id="item-name-th" name="name-th" required />
              </div>
              <div className="field-pair">
                <label htmlFor="item-name-en">English name</label>
                <input defaultValue={editing?.nameEn} id="item-name-en" name="name-en" required />
              </div>
            </div>
            <div className="staff-desk__field-grid">
              <div className="field-pair">
                <label htmlFor="item-category">Category</label>
                <select defaultValue={editing?.category ?? "extra"} id="item-category" name="category">
                  {DESK_SELLABLE_CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}
                </select>
              </div>
              <div className="field-pair">
                <label htmlFor="item-price">Price (baht)</label>
                <input defaultValue={editing ? satangToBaht(editing.priceSatang).toFixed(2) : ""} id="item-price" min="0" name="price-baht" required step="0.01" type="number" />
              </div>
              <div className="field-pair">
                <label htmlFor="item-minimum">Minimum</label>
                <input defaultValue={editing?.minimum ?? 0} id="item-minimum" min="0" name="minimum" type="number" />
              </div>
            </div>
            <fieldset className="staff-desk__fieldset">
              <legend>Ingredients per sale</legend>
              <div className="staff-desk__ingredient-grid">
                {countedItems.filter((item) => item.active).map((item) => (
                  <div className="field-pair" key={item.id}>
                    <label htmlFor={`ingredient-${item.id}`}>{item.nameEn} ({item.unit})</label>
                    <input defaultValue={ingredientMap.get(item.id) ?? ""} id={`ingredient-${item.id}`} min="0" name={`ingredient-${item.id}`} placeholder="0" type="number" />
                  </div>
                ))}
              </div>
            </fieldset>
            <fieldset className="staff-desk__fieldset">
              <legend>Attached laundry (room items only)</legend>
              <div className="staff-desk__checks">
                {laundryItems.length ? laundryItems.map((item) => (
                  <label className="staff-desk__check" key={item.id}>
                    <input
                      defaultChecked={editing?.attachedLaundryIds.includes(item.id)}
                      name="attached-laundry-id"
                      type="checkbox"
                      value={item.id}
                    />
                    {bilingualItemLabel(item)}
                  </label>
                )) : <p className="staff-desk__empty">Create laundry items before attaching them to rooms.</p>}
              </div>
            </fieldset>
            <label className="staff-desk__check">
              <input defaultChecked={editing?.active ?? true} name="active" type="checkbox" />
              Active item
            </label>
            <button className="button button--primary" type="submit">Save item</button>
          </form>
        </div>
      </section>
    </StaffShell>
  );
}
