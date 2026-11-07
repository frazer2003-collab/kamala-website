import Link from "next/link";
import {
  recordStockMovement,
  saveCountedItem,
} from "@/app/desk-actions";
import { StaffShell } from "@/components/staff-shell";
import {
  listDeskCountedItems,
  listDeskSellables,
  listDeskStockMovements,
} from "@/lib/desk-ops-data";
import { bilingualItemLabel, DESK_COUNTED_UNITS } from "@/lib/desk-items";
import {
  headroom,
  mealsLeft,
  sortByShortestHeadroom,
} from "@/lib/desk-stock";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

function quantityLabel(quantity: number, unit: "count" | "grams") {
  return unit === "grams" ? `${quantity.toLocaleString()} g` : quantity.toLocaleString();
}

export default async function StaffStockPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireStaffSession();
  const { edit } = await searchParams;
  const [items, sellables, movements] = await Promise.all([
    listDeskCountedItems(),
    listDeskSellables(),
    listDeskStockMovements(),
  ]);
  const activeItems = sortByShortestHeadroom(items.filter((item) => item.active));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const editing = items.find((item) => item.id === edit) ?? null;
  const foods = sellables.filter(
    (item) => item.active && item.category === "food" && item.ingredients.length,
  );

  return (
    <StaffShell current="stock">
      <section className="staff-main staff-desk" aria-labelledby="desk-stock-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-stock-title">Stock</h1>
            <p>Low headroom comes first. Receive purchases, record waste, or correct a count.</p>
          </div>
        </header>

        <section className="staff-desk__strip" aria-labelledby="meals-left-title">
          <h2 id="meals-left-title">Meals left</h2>
          <div className="staff-desk__meal-grid">
            {foods.length ? foods.map((food) => {
              const ingredients = food.ingredients.flatMap((ingredient) => {
                const item = itemById.get(ingredient.countedItemId);
                return item
                  ? [{
                      onHand: item.onHand,
                      minimum: item.minimum,
                      quantityPerMeal: ingredient.quantity,
                    }]
                  : [];
              });
              return (
                <div className="staff-desk__meal" key={food.id}>
                  <strong>{mealsLeft(ingredients)}</strong>
                  <span>{bilingualItemLabel(food)}</span>
                </div>
              );
            }) : <p className="staff-desk__empty">Add ingredients to a food item to calculate meals.</p>}
          </div>
        </section>

        <div className="staff-desk__workspace">
          <section className="staff-desk__panel" aria-labelledby="stock-list-title">
            <header className="staff-desk__panel-head">
              <div>
                <h2 id="stock-list-title">Counted items</h2>
                <p>Current quantity compared with the minimum.</p>
              </div>
            </header>
            <div className="staff-desk__table-wrap">
              <table className="staff-desk__table">
                <thead>
                  <tr><th>Item</th><th>On hand</th><th>Minimum</th><th>Headroom</th></tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => {
                    const room = headroom(item.onHand, item.minimum);
                    return (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/staff/stock?edit=${item.id}`}>
                            {bilingualItemLabel(item)}
                          </Link>
                        </td>
                        <td>{quantityLabel(item.onHand, item.unit)}</td>
                        <td>{quantityLabel(item.minimum, item.unit)}</td>
                        <td>
                          <span className={`desk-status ${room <= 0 ? "desk-status--warning" : "desk-status--open"}`}>
                            {room > 0 ? "+" : ""}{quantityLabel(room, item.unit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="staff-desk__form-stack">
            <form action={recordStockMovement} className="staff-desk__form">
              <h2>Receive or adjust</h2>
              <div className="field-pair">
                <label htmlFor="movement-item">Item</label>
                <select id="movement-item" name="counted-item-id" required>
                  <option value="">Choose stock</option>
                  {activeItems.map((item) => <option key={item.id} value={item.id}>{item.nameEn}</option>)}
                </select>
              </div>
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="movement-reason">Reason</label>
                  <select id="movement-reason" name="reason">
                    <option value="purchase">Purchase / receive</option>
                    <option value="waste">Waste</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div className="field-pair">
                  <label htmlFor="movement-quantity">Quantity</label>
                  <input id="movement-quantity" name="quantity" required type="number" />
                </div>
              </div>
              <div className="field-pair">
                <label htmlFor="movement-note">Note</label>
                <input id="movement-note" name="note" placeholder="Supplier or reason" />
              </div>
              <button className="button button--primary" type="submit">Record movement</button>
            </form>

            <form action={saveCountedItem} className="staff-desk__form">
              <h2>{editing ? "Edit counted item" : "Add counted item"}</h2>
              {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="stock-name-th">Thai name</label>
                  <input defaultValue={editing?.nameTh} id="stock-name-th" name="name-th" required />
                </div>
                <div className="field-pair">
                  <label htmlFor="stock-name-en">English name</label>
                  <input defaultValue={editing?.nameEn} id="stock-name-en" name="name-en" required />
                </div>
              </div>
              <div className="staff-desk__field-grid">
                <div className="field-pair">
                  <label htmlFor="stock-unit">Unit</label>
                  <select defaultValue={editing?.unit ?? "count"} id="stock-unit" name="unit">
                    {DESK_COUNTED_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
                <div className="field-pair">
                  <label htmlFor="stock-minimum">Minimum</label>
                  <input defaultValue={editing?.minimum ?? 0} id="stock-minimum" min="0" name="minimum" type="number" />
                </div>
              </div>
              <div className="field-pair">
                <label htmlFor="stock-opening">Opening quantity</label>
                <input defaultValue={editing?.openingQuantity ?? 0} id="stock-opening" min="0" name="opening-quantity" type="number" />
              </div>
              <label className="staff-desk__check">
                <input defaultChecked={editing?.active ?? true} name="active" type="checkbox" />
                Active item
              </label>
              <button className="button button--secondary" type="submit">Save counted item</button>
            </form>
          </div>
        </div>

        <section className="staff-desk__panel" aria-labelledby="movement-history-title">
          <header className="staff-desk__panel-head"><h2 id="movement-history-title">Recent movements</h2></header>
          <ul className="staff-desk__history">
            {movements.slice(0, 12).map((movement) => (
              <li key={movement.id}>
                <strong>{itemById.get(movement.countedItemId)?.nameEn ?? "Removed item"}</strong>
                <span>{movement.quantity > 0 ? "+" : ""}{movement.quantity} {movement.reason.replace("_", " ")}</span>
                <small>{movement.note || new Date(movement.occurredAt).toLocaleString("en")}</small>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </StaffShell>
  );
}
