"use client";

import { useMemo, useState } from "react";
import {
  deactivateCountedItem,
  recordStockMovement,
  saveCountedItem,
} from "@/app/desk-actions";
import { StaffCombo } from "@/components/staff-combo";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { bilingualItemLabel, DESK_COUNTED_UNITS } from "@/lib/desk-items";
import {
  headroom,
  mealsLeft,
  sortByShortestHeadroom,
} from "@/lib/desk-stock";
import type {
  DeskCountedItem,
  DeskSellableItem,
  DeskStockMovement,
} from "@/lib/desk-ops-data";

function quantityLabel(quantity: number, unit: "count" | "grams") {
  return unit === "grams" ? `${quantity.toLocaleString()} g` : quantity.toLocaleString();
}

export function StaffDeskStock({
  items,
  sellables,
  movements,
}: {
  items: DeskCountedItem[];
  sellables: DeskSellableItem[];
  movements: DeskStockMovement[];
}) {
  const { t, locale } = useStaffLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activeItems = useMemo(
    () => sortByShortestHeadroom(items.filter((item) => item.active)),
    [items],
  );
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const editing = creating ? null : items.find((item) => item.id === selectedId) ?? null;
  const foods = sellables.filter(
    (item) => item.active && item.category === "food" && item.ingredients.length,
  );
  const itemOptions = activeItems.map((item) => ({
    value: item.id,
    label: bilingualItemLabel(item),
    keywords: `${item.nameEn} ${item.nameTh}`,
  }));
  const reasonOptions = [
    { value: "purchase", label: t("stock.purchase") },
    { value: "waste", label: t("stock.waste") },
    { value: "adjustment", label: t("stock.adjustment") },
  ];
  const unitOptions = DESK_COUNTED_UNITS.map((unit) => ({
    value: unit,
    label: unit,
  }));

  return (
    <>
      <section className="staff-desk__strip" aria-labelledby="meals-left-title">
        <h2 id="meals-left-title">{t("stock.mealsLeft")}</h2>
        <div className="staff-desk__meal-grid">
          {foods.length ? (
            foods.map((food) => {
              const ingredients = food.ingredients.flatMap((ingredient) => {
                const item = itemById.get(ingredient.countedItemId);
                return item
                  ? [
                      {
                        onHand: item.onHand,
                        minimum: item.minimum,
                        quantityPerMeal: ingredient.quantity,
                      },
                    ]
                  : [];
              });
              return (
                <div className="staff-desk__meal" key={food.id}>
                  <strong>{mealsLeft(ingredients)}</strong>
                  <span>{bilingualItemLabel(food)}</span>
                </div>
              );
            })
          ) : (
            <p className="staff-desk__empty">
              Add ingredients to a food item to calculate meals.
            </p>
          )}
        </div>
      </section>

      <div className="staff-desk__workspace">
        <section className="staff-desk__panel" aria-labelledby="stock-list-title">
          <header className="staff-desk__panel-head">
            <div>
              <h2 id="stock-list-title">{t("stock.counted")}</h2>
              <p>Current quantity compared with the minimum.</p>
            </div>
            <button
              className="button button--quiet"
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
              }}
              type="button"
            >
              {t("stock.addCounted")}
            </button>
          </header>
          <div className="staff-desk__table-wrap">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("bills.item")}</th>
                  <th>{t("stock.onHand")}</th>
                  <th>{t("stock.minimum")}</th>
                  <th>{t("stock.headroom")}</th>
                </tr>
              </thead>
              <tbody>
                  {activeItems.map((item) => {
                    const room = headroom(item.onHand, item.minimum);
                    return (
                      <tr
                        className="staff-desk__click-row"
                        key={item.id}
                        onClick={() => {
                          setCreating(false);
                          setSelectedId(item.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setCreating(false);
                            setSelectedId(item.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <td>
                          <strong>{bilingualItemLabel(item)}</strong>
                        </td>
                        <td>{quantityLabel(item.onHand, item.unit)}</td>
                        <td>{quantityLabel(item.minimum, item.unit)}</td>
                        <td>
                          <span
                            className={`desk-status ${room <= 0 ? "desk-status--warning" : "desk-status--open"}`}
                          >
                            {room > 0 ? "+" : ""}
                            {quantityLabel(room, item.unit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        <form action={recordStockMovement} className="staff-desk__form">
          <h2>{t("stock.receive")}</h2>
          <div className="field-pair">
            <StaffCombo
              clearOnSelect={false}
              id="movement-item"
              label={t("bills.item")}
              name="counted-item-id"
              options={itemOptions}
              placeholder={t("desk.typeToSearch")}
              required
            />
          </div>
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <StaffCombo
                clearOnSelect={false}
                defaultValue="purchase"
                id="movement-reason"
                label="Reason"
                name="reason"
                options={reasonOptions}
                placeholder={t("desk.typeToSearch")}
                required
              />
            </div>
            <div className="field-pair">
              <label htmlFor="movement-quantity">{t("common.quantity")}</label>
              <input id="movement-quantity" name="quantity" required type="number" />
            </div>
          </div>
          <div className="field-pair">
            <label htmlFor="movement-note">{t("common.note")}</label>
            <input id="movement-note" name="note" placeholder="Supplier or reason" />
          </div>
          <button className="button button--primary" type="submit">
            {t("stock.record")}
          </button>
        </form>
      </div>

      <section className="staff-desk__panel" aria-labelledby="movement-history-title">
        <header className="staff-desk__panel-head">
          <h2 id="movement-history-title">{t("stock.recent")}</h2>
        </header>
        <ul className="staff-desk__history">
          {movements.slice(0, 12).map((movement) => (
            <li key={movement.id}>
              <strong>
                {itemById.get(movement.countedItemId)?.nameEn ?? "Removed item"}
              </strong>
              <span>
                {movement.quantity > 0 ? "+" : ""}
                {movement.quantity} {movement.reason.replace("_", " ")}
              </span>
              <small>
                {movement.note ||
                  new Date(movement.occurredAt).toLocaleString(
                    locale === "th" ? "th" : "en",
                  )}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <StaffDialog
        onClose={() => {
          setSelectedId(null);
          setCreating(false);
        }}
        open={creating || Boolean(editing)}
        title={editing ? t("stock.editCounted") : t("stock.addCounted")}
        footer={
          editing ? (
            <form action={deactivateCountedItem}>
              <input name="id" type="hidden" value={editing.id} />
              <button className="button button--quiet" type="submit">
                {t("common.delete")}
              </button>
            </form>
          ) : null
        }
      >
        <form action={saveCountedItem} className="staff-desk__form staff-desk__form--dialog">
          {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <label htmlFor="stock-name-th">{t("items.thaiName")}</label>
              <input
                defaultValue={editing?.nameTh}
                id="stock-name-th"
                name="name-th"
                required
              />
            </div>
            <div className="field-pair">
              <label htmlFor="stock-name-en">{t("items.englishName")}</label>
              <input
                defaultValue={editing?.nameEn}
                id="stock-name-en"
                name="name-en"
                required
              />
            </div>
          </div>
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <StaffCombo
                clearOnSelect={false}
                defaultValue={editing?.unit ?? "count"}
                id="stock-unit"
                label={t("stock.unit")}
                name="unit"
                options={unitOptions}
                placeholder={t("desk.typeToSearch")}
                required
              />
            </div>
            <div className="field-pair">
              <label htmlFor="stock-minimum">{t("stock.minimum")}</label>
              <input
                defaultValue={editing?.minimum ?? 0}
                id="stock-minimum"
                min="0"
                name="minimum"
                type="number"
              />
            </div>
          </div>
          <div className="field-pair">
            <label htmlFor="stock-opening">{t("stock.opening")}</label>
            <input
              defaultValue={editing?.openingQuantity ?? 0}
              id="stock-opening"
              min="0"
              name="opening-quantity"
              type="number"
            />
          </div>
          {editing ? (
            <dl className="staff-desk__details">
              <div>
                <dt>{t("stock.onHand")}</dt>
                <dd>{quantityLabel(editing.onHand, editing.unit)}</dd>
              </div>
              <div>
                <dt>{t("stock.headroom")}</dt>
                <dd>{quantityLabel(headroom(editing.onHand, editing.minimum), editing.unit)}</dd>
              </div>
            </dl>
          ) : null}
          <label className="staff-desk__check">
            <input
              defaultChecked={editing?.active ?? true}
              name="active"
              type="checkbox"
            />
            {t("stock.activeItem")}
          </label>
          <button className="button button--secondary" type="submit">
            {t("stock.saveCounted")}
          </button>
        </form>
      </StaffDialog>
    </>
  );
}
