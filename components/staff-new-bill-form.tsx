"use client";

import { StaffCombo } from "@/components/staff-combo";
import { useStaffLocale } from "@/components/staff-locale";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang } from "@/lib/desk-money";
import type { DeskSellableItem } from "@/lib/desk-ops-data";

export function StaffNewBillForm({
  action,
  sellables,
}: {
  action: (formData: FormData) => Promise<void>;
  sellables: DeskSellableItem[];
}) {
  const { t } = useStaffLocale();
  const options = sellables.map((item) => ({
    value: item.id,
    label: `${bilingualItemLabel(item)} - ${formatSatang(item.priceSatang)}`,
    keywords: `${item.nameEn} ${item.nameTh}`,
  }));

  return (
    <form action={action} className="staff-desk__form staff-desk__form--narrow">
      <div className="field-pair">
        <label htmlFor="new-bill-name">{t("common.name")}</label>
        <input
          autoFocus
          id="new-bill-name"
          name="name"
          placeholder="Guest or table name"
          required
        />
      </div>
      <div className="field-pair">
        <label htmlFor="new-bill-room">{t("common.room")}</label>
        <input id="new-bill-room" name="room" placeholder="For example 204" />
      </div>
      <div className="field-pair">
        <StaffCombo
          clearOnSelect={false}
          emptyLabel="Save an empty bill"
          id="new-bill-item"
          label={t("bills.addItem")}
          name="sellable-item-id"
          options={options}
          placeholder={t("desk.typeToSearch")}
        />
      </div>
      <div className="field-pair staff-desk__quantity">
        <label htmlFor="new-bill-quantity">{t("bills.qty")}</label>
        <input
          defaultValue="1"
          id="new-bill-quantity"
          min="1"
          name="quantity"
          type="number"
        />
      </div>
      <div className="staff-desk__form-actions">
        <button className="button button--primary" type="submit">
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
