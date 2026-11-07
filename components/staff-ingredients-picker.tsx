"use client";

import { useMemo, useState } from "react";
import { StaffCombo, type StaffComboOption } from "@/components/staff-combo";
import { useStaffLocale } from "@/components/staff-locale";
import { bilingualItemLabel } from "@/lib/desk-items";
import type { DeskCountedItem } from "@/lib/desk-ops-data";

type IngredientDraft = {
  countedItemId: string;
  quantity: number;
  label: string;
  unit: DeskCountedItem["unit"];
};

export function StaffIngredientsPicker({
  countedItems,
  initial,
}: {
  countedItems: DeskCountedItem[];
  initial?: Array<{ countedItemId: string; quantity: number }>;
}) {
  const { t } = useStaffLocale();
  const active = countedItems.filter((item) => item.active);
  const byId = useMemo(
    () => new Map(active.map((item) => [item.id, item])),
    [active],
  );

  const [rows, setRows] = useState<IngredientDraft[]>(() => {
    const next: IngredientDraft[] = [];
    for (const entry of initial ?? []) {
      const item = byId.get(entry.countedItemId);
      if (!item || entry.quantity <= 0) continue;
      next.push({
        countedItemId: item.id,
        quantity: entry.quantity,
        label: bilingualItemLabel(item),
        unit: item.unit,
      });
    }
    return next;
  });

  const available = active.filter(
    (item) => !rows.some((row) => row.countedItemId === item.id),
  );
  const options: StaffComboOption[] = available.map((item) => ({
    value: item.id,
    label: `${bilingualItemLabel(item)} (${item.unit})`,
    keywords: `${item.nameEn} ${item.nameTh}`,
  }));

  return (
    <fieldset className="staff-desk__fieldset">
      <legend>{t("items.ingredients")}</legend>
      <ul className="staff-desk__ingredient-list">
        {rows.map((row) => (
          <li key={row.countedItemId}>
            <input name={`ingredient-${row.countedItemId}`} type="hidden" value={row.quantity} />
            <span>
              {row.label}
              <small>{row.unit}</small>
            </span>
            <input
              aria-label={`${row.label} quantity`}
              min="1"
              onChange={(event) => {
                const quantity = Number(event.target.value);
                setRows((current) =>
                  current.map((entry) =>
                    entry.countedItemId === row.countedItemId
                      ? {
                          ...entry,
                          quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1,
                        }
                      : entry,
                  ),
                );
              }}
              type="number"
              value={row.quantity}
            />
            <button
              className="button button--quiet"
              onClick={() =>
                setRows((current) =>
                  current.filter((entry) => entry.countedItemId !== row.countedItemId),
                )
              }
              type="button"
            >
              {t("common.remove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="field-pair">
        <StaffCombo
          clearOnSelect
          id="ingredient-search"
          label={t("items.addIngredient")}
          onSelect={(option) => {
            if (!option) return;
            const item = byId.get(option.value);
            if (!item) return;
            setRows((current) => [
              ...current,
              {
                countedItemId: item.id,
                quantity: 1,
                label: bilingualItemLabel(item),
                unit: item.unit,
              },
            ]);
          }}
          options={options}
          persistValue={false}
          placeholder={t("desk.typeToSearch")}
        />
      </div>
    </fieldset>
  );
}
