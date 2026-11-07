"use client";

import { useMemo, useState } from "react";
import {
  deactivateSellableItem,
  saveSellableItem,
} from "@/app/desk-actions";
import { StaffDialog } from "@/components/staff-dialog";
import { StaffIngredientsPicker } from "@/components/staff-ingredients-picker";
import { useStaffLocale } from "@/components/staff-locale";
import {
  bilingualItemLabel,
  DESK_SELLABLE_CATEGORIES,
} from "@/lib/desk-items";
import { formatSatang, satangToBaht } from "@/lib/desk-money";
import type { DeskCountedItem, DeskSellableItem } from "@/lib/desk-ops-data";

export function StaffDeskItems({
  sellables,
  countedItems,
  initialQuery = "",
  initialCategory = "",
}: {
  sellables: DeskSellableItem[];
  countedItems: DeskCountedItem[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const { t } = useStaffLocale();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sellables.filter(
      (item) =>
        (!category || item.category === category) &&
        (!needle ||
          item.nameEn.toLowerCase().includes(needle) ||
          item.nameTh.toLowerCase().includes(needle)),
    );
  }, [sellables, query, category]);

  const selected = sellables.find((item) => item.id === selectedId) ?? null;
  const editing = creating ? null : selected;
  const laundryItems = sellables.filter(
    (item) => item.category === "laundry" && item.active,
  );

  return (
    <>
      <div className="staff-desk__filter staff-desk__filter--client">
        <div className="field-pair staff-desk__grow">
          <label htmlFor="items-q">{t("common.find")}</label>
          <input
            id="items-q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Thai or English name"
            type="search"
            value={query}
          />
        </div>
        <div className="field-pair">
          <label htmlFor="items-category">{t("items.category")}</label>
          <select
            id="items-category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">{t("items.allCategories")}</option>
            {DESK_SELLABLE_CATEGORIES.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </div>
        <button
          className="button button--quiet"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
          type="button"
        >
          {t("items.new")}
        </button>
      </div>

      <section className="staff-desk__panel" aria-labelledby="catalog-title">
        <header className="staff-desk__panel-head">
          <h2 id="catalog-title">{t("items.catalog")}</h2>
          <span>
            {visible.length} {t("nav.items").toLowerCase()}
          </span>
        </header>
        <div className="staff-desk__table-wrap">
          <table className="staff-desk__table">
            <thead>
              <tr>
                <th>{t("bills.item")}</th>
                <th>{t("items.category")}</th>
                <th>{t("items.price")}</th>
                <th>{t("items.recipe")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
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
                  <td>{item.category}</td>
                  <td>{formatSatang(item.priceSatang)}</td>
                  <td>{item.ingredients.length || "-"}</td>
                  <td>
                    <span
                      className={`desk-status desk-status--${item.active ? "open" : "cleared"}`}
                    >
                      {item.active ? t("common.active") : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StaffDialog
        onClose={() => {
          setSelectedId(null);
          setCreating(false);
        }}
        open={creating || Boolean(selected)}
        title={editing ? t("items.edit") : t("items.create")}
        footer={
          editing ? (
            <form action={deactivateSellableItem}>
              <input name="id" type="hidden" value={editing.id} />
              <button className="button button--quiet" type="submit">
                {t("common.delete")}
              </button>
            </form>
          ) : null
        }
      >
        <form action={saveSellableItem} className="staff-desk__form staff-desk__form--dialog">
          {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <label htmlFor="item-name-th">{t("items.thaiName")}</label>
              <input
                defaultValue={editing?.nameTh}
                id="item-name-th"
                name="name-th"
                required
              />
            </div>
            <div className="field-pair">
              <label htmlFor="item-name-en">{t("items.englishName")}</label>
              <input
                defaultValue={editing?.nameEn}
                id="item-name-en"
                name="name-en"
                required
              />
            </div>
          </div>
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <label htmlFor="item-category">{t("items.category")}</label>
              <select
                defaultValue={editing?.category ?? "extra"}
                id="item-category"
                name="category"
                required
              >
                {DESK_SELLABLE_CATEGORIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-pair">
              <label htmlFor="item-price">{t("items.price")}</label>
              <input
                defaultValue={
                  editing ? satangToBaht(editing.priceSatang).toFixed(2) : ""
                }
                id="item-price"
                min="0"
                name="price-baht"
                required
                step="0.01"
                type="number"
              />
            </div>
            <div className="field-pair">
              <label htmlFor="item-minimum">{t("stock.minimum")}</label>
              <input
                defaultValue={editing?.minimum ?? 0}
                id="item-minimum"
                min="0"
                name="minimum"
                type="number"
              />
            </div>
          </div>
          <StaffIngredientsPicker
            countedItems={countedItems}
            initial={editing?.ingredients}
            key={editing?.id ?? "new"}
          />
          <fieldset className="staff-desk__fieldset">
            <legend>{t("items.attachedLaundry")}</legend>
            <div className="staff-desk__checks">
              {laundryItems.length ? (
                laundryItems.map((item) => (
                  <label className="staff-desk__check" key={item.id}>
                    <input
                      defaultChecked={editing?.attachedLaundryIds.includes(item.id)}
                      name="attached-laundry-id"
                      type="checkbox"
                      value={item.id}
                    />
                    {bilingualItemLabel(item)}
                  </label>
                ))
              ) : (
                <p className="staff-desk__empty">
                  Create laundry items before attaching them to rooms.
                </p>
              )}
            </div>
          </fieldset>
          <label className="staff-desk__check">
            <input
              defaultChecked={editing?.active ?? true}
              name="active"
              type="checkbox"
            />
            {t("items.active")}
          </label>
          <button className="button button--primary" type="submit">
            {t("items.save")}
          </button>
        </form>
      </StaffDialog>
    </>
  );
}
