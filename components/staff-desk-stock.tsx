"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deactivateCountedItem,
  recordStockMovement,
  saveCountedItem,
} from "@/app/desk-actions";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { StaffCombo } from "@/components/staff-combo";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { bilingualItemLabel, DESK_UNIT_SUGGESTIONS } from "@/lib/desk-items";
import { satangToBaht } from "@/lib/desk-money";
import {
  formatProjectionDays,
  projectStockLevels,
} from "@/lib/desk-stock-projections";
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

function quantityLabel(quantity: number, unit: string) {
  const label = unit.trim() || "count";
  if (label === "grams" || label === "g") {
    return `${quantity.toLocaleString()} g`;
  }
  return `${quantity.toLocaleString()} ${label}`;
}

export function StaffDeskStock({
  items,
  sellables,
  movements,
  initialOpenId = null,
}: {
  items: DeskCountedItem[];
  sellables: DeskSellableItem[];
  movements: DeskStockMovement[];
  initialOpenId?: string | null;
}) {
  const { t } = useStaffLocale();
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSelectedId(initialOpenId);
    if (initialOpenId) setCreating(false);
  }, [initialOpenId]);

  const activeItems = useMemo(
    () => sortByShortestHeadroom(items.filter((item) => item.active)),
    [items],
  );
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const projections = useMemo(
    () =>
      projectStockLevels(
        items,
        movements.map((movement) => ({
          countedItemId: movement.countedItemId,
          quantity: movement.quantity,
          reason: movement.reason,
          occurredAt: movement.occurredAt,
        })),
      ),
    [items, movements],
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
  const unitSuggestions = useMemo(() => {
    const custom = items.map((item) => item.unit).filter(Boolean);
    return Array.from(new Set([...DESK_UNIT_SUGGESTIONS, ...custom]));
  }, [items]);

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

      {activeItems.length ? (
        <div className="staff-desk__list-toolbar">
          <button
            className="button button--primary"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
            type="button"
          >
            {t("stock.addCounted")}
          </button>
        </div>
      ) : null}

      <div className="staff-desk__panel">
        {activeItems.length ? (
          <div className="staff-desk__table-wrap">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("bills.item")}</th>
                  <th>{t("stock.unit")}</th>
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
                      <td>{item.unit}</td>
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
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("stock.empty")}</h2>
            <p>{t("stock.emptyHint")}</p>
            <button
              className="button button--primary"
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
              }}
              type="button"
            >
              {t("stock.addCounted")}
            </button>
          </div>
        )}
      </div>

      {activeItems.length ? (
        <DeskQuietForm
          action={recordStockMovement}
          className="staff-desk__form staff-desk__form--strip"
          resetOnSuccess
        >
          {(pending) => (
            <>
              <h2>{t("stock.receive")}</h2>
              <div className="staff-desk__field-grid">
                <div className="field-pair staff-desk__grow">
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
                <div className="field-pair">
                  <label htmlFor="movement-reason">{t("stock.reason")}</label>
                  <select
                    defaultValue="purchase"
                    id="movement-reason"
                    name="reason"
                    required
                  >
                    <option value="purchase">{t("stock.purchase")}</option>
                    <option value="waste">{t("stock.waste")}</option>
                    <option value="adjustment">{t("stock.adjustment")}</option>
                  </select>
                </div>
                <div className="field-pair">
                  <label htmlFor="movement-quantity">{t("common.quantity")}</label>
                  <input
                    id="movement-quantity"
                    name="quantity"
                    required
                    type="number"
                  />
                </div>
              </div>
              <div className="field-pair">
                <label htmlFor="movement-note">{t("common.note")}</label>
                <input
                  id="movement-note"
                  name="note"
                  placeholder={t("stock.reason")}
                />
              </div>
              <button
                className="button button--primary"
                disabled={pending}
                type="submit"
              >
                {deskPendingLabel(pending, t("stock.record"), t("common.saving"))}
              </button>
            </>
          )}
        </DeskQuietForm>
      ) : null}

      <div className="staff-desk__panel">
        {projections.length ? (
          <div className="staff-desk__table-wrap">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("bills.item")}</th>
                  <th>{t("stock.onHand")}</th>
                  <th>{t("stock.avgDaily")}</th>
                  <th>{t("stock.daysToMin")}</th>
                  <th>{t("stock.daysLeft")}</th>
                  <th>{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((row) => {
                  const item = itemById.get(row.countedItemId);
                  if (!item) return null;
                  return (
                    <tr key={row.countedItemId}>
                      <td>
                        <strong>{bilingualItemLabel(item)}</strong>
                      </td>
                      <td>{quantityLabel(row.onHand, item.unit)}</td>
                      <td>
                        {row.avgDailyUse > 0
                          ? `${row.avgDailyUse.toFixed(1)} / day`
                          : "—"}
                      </td>
                      <td>{formatProjectionDays(row.daysToMinimum)}</td>
                      <td>{formatProjectionDays(row.daysLeft)}</td>
                      <td>
                        <span
                          className={`desk-status desk-status--${
                            row.tone === "ok"
                              ? "open"
                              : row.tone === "watch"
                                ? "incomplete"
                                : "warning"
                          }`}
                        >
                          {t(`stock.tone.${row.tone}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("stock.projections")}</h2>
            <p>{t("stock.projectionsEmpty")}</p>
          </div>
        )}
      </div>

      <StaffDialog
        onClose={() => {
          setSelectedId(null);
          setCreating(false);
        }}
        open={creating || Boolean(editing)}
        title={editing ? t("stock.editCounted") : t("stock.addCounted")}
        footer={
          editing ? (
            <DeskQuietForm
              action={deactivateCountedItem}
              onSuccess={() => {
                setSelectedId(null);
                setCreating(false);
              }}
            >
              {(pending) => (
                <>
                  <input name="id" type="hidden" value={editing.id} />
                  <button
                    className="button button--quiet"
                    disabled={pending}
                    type="submit"
                  >
                    {deskPendingLabel(pending, t("common.delete"), "…")}
                  </button>
                </>
              )}
            </DeskQuietForm>
          ) : null
        }
      >
        <DeskQuietForm
          action={saveCountedItem}
          className="staff-desk__form staff-desk__form--dialog"
          onSuccess={() => {
            setSelectedId(null);
            setCreating(false);
          }}
        >
          {(pending) => (
            <>
              {editing ? <input name="id" type="hidden" value={editing.id} /> : null}

              <fieldset className="staff-desk__fieldset">
                <legend>{t("items.setupNames")}</legend>
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
              </fieldset>

              <fieldset className="staff-desk__fieldset">
                <legend>{t("stock.setupMeasure")}</legend>
                <div className="staff-desk__field-grid">
                  <div className="field-pair">
                    <label htmlFor="stock-unit">{t("stock.unit")}</label>
                    <input
                      defaultValue={editing?.unit ?? "count"}
                      id="stock-unit"
                      list="stock-unit-suggestions"
                      name="unit"
                      placeholder="ml, bottle, pack…"
                      required
                    />
                    <datalist id="stock-unit-suggestions">
                      {unitSuggestions.map((unit) => (
                        <option key={unit} value={unit} />
                      ))}
                    </datalist>
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
                </div>
                <p className="staff-desk__hint">{t("stock.unitHint")}</p>
              </fieldset>

              <fieldset className="staff-desk__fieldset">
                <legend>{t("items.setupSell")}</legend>
                <div className="staff-desk__field-grid">
                  <div className="field-pair">
                    <label htmlFor="stock-cost">{t("items.cost")}</label>
                    <input
                      defaultValue={
                        editing ? satangToBaht(editing.costSatang).toFixed(2) : "0"
                      }
                      id="stock-cost"
                      min="0"
                      name="cost-baht"
                      step="0.01"
                      type="number"
                    />
                  </div>
                  <div className="field-pair">
                    <label htmlFor="stock-sell">{t("items.sell")}</label>
                    <input
                      defaultValue={
                        editing
                          ? satangToBaht(editing.sellPriceSatang).toFixed(2)
                          : "0"
                      }
                      id="stock-sell"
                      min="0"
                      name="sell-price-baht"
                      step="0.01"
                      type="number"
                    />
                  </div>
                </div>
              </fieldset>

              {editing ? (
                <dl className="staff-desk__details">
                  <div>
                    <dt>{t("stock.onHand")}</dt>
                    <dd>{quantityLabel(editing.onHand, editing.unit)}</dd>
                  </div>
                  <div>
                    <dt>{t("stock.headroom")}</dt>
                    <dd>
                      {quantityLabel(
                        headroom(editing.onHand, editing.minimum),
                        editing.unit,
                      )}
                    </dd>
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
              <button
                className="button button--secondary"
                disabled={pending}
                type="submit"
              >
                {deskPendingLabel(pending, t("stock.saveCounted"), t("common.saving"))}
              </button>
            </>
          )}
        </DeskQuietForm>
      </StaffDialog>
    </>
  );
}
