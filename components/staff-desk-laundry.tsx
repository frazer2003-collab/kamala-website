"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createLaundryRecord,
  deleteLaundryRecord,
  receiveLaundryRecord,
  updateLaundryRecord,
} from "@/app/desk-actions";
import { StaffDeskActionsMenu } from "@/components/staff-desk-actions-menu";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import {
  DESK_LAUNDRY_CATEGORIES,
  DESK_LAUNDRY_STATUSES,
  DESK_SHEET_ITEMS,
  formatLaundryMeasure,
  sheetItemLabel,
  type DeskLaundryCategory,
  type DeskLaundryStatus,
} from "@/lib/desk-laundry";
import { formatSatang, satangToBaht } from "@/lib/desk-money";
import type { DeskLaundryRecord } from "@/lib/desk-ops-data";

function dateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function laundryCategoryLabel(
  category: DeskLaundryCategory,
  t: (key: string) => string,
) {
  return category === "sheets" ? t("laundry.catSheets") : t("laundry.catLaundry");
}

function laundryStatusLabel(
  status: DeskLaundryStatus,
  t: (key: string) => string,
) {
  return status === "paid" ? t("laundry.paid") : t("laundry.unpaid");
}

function LaundryCreateFields({
  sheetsOnly,
  categories,
  category,
  setCategory,
  measureType,
  setMeasureType,
  pending,
  locale,
  t,
}: {
  sheetsOnly: boolean;
  categories: readonly DeskLaundryCategory[];
  category: DeskLaundryCategory;
  setCategory: (value: DeskLaundryCategory) => void;
  measureType: "kg" | "count";
  setMeasureType: (value: "kg" | "count") => void;
  pending: boolean;
  locale: "th" | "en";
  t: (key: string) => string;
}) {
  const sheetsMode = sheetsOnly || category === "sheets";

  return (
    <>
      <div className="field-pair">
        <label htmlFor="laundry-name">{t("common.name")}</label>
        <input
          id="laundry-name"
          name="name"
          placeholder={t("laundry.placeholder")}
          required
        />
      </div>
      <div className="staff-desk__field-grid">
        <div className="field-pair">
          {sheetsOnly ? (
            <>
              <label htmlFor="laundry-category">{t("laundry.category")}</label>
              <input name="category" type="hidden" value="sheets" />
              <input
                id="laundry-category"
                readOnly
                value={t("laundry.catSheets")}
              />
            </>
          ) : (
            <>
              <label htmlFor="laundry-category">{t("laundry.category")}</label>
              <select
                id="laundry-category"
                name="category"
                onChange={(event) => {
                  const next = event.target.value as DeskLaundryCategory;
                  setCategory(next);
                  if (next === "sheets") setMeasureType("count");
                }}
                required
                value={category}
              >
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {laundryCategoryLabel(entry, t)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        {!sheetsMode ? (
          <div className="field-pair">
            <label htmlFor="laundry-measure-type">{t("laundry.measure")}</label>
            <select
              id="laundry-measure-type"
              name="measure-type"
              onChange={(event) =>
                setMeasureType(event.target.value === "count" ? "count" : "kg")
              }
              value={measureType}
            >
              <option value="kg">{t("laundry.kilograms")}</option>
              <option value="count">{t("laundry.pieces")}</option>
            </select>
          </div>
        ) : null}
      </div>

      {sheetsMode ? (
        <fieldset className="staff-desk__sheet-fieldset">
          <legend>{t("laundry.sheetItems")}</legend>
          <p className="staff-desk__hint">{t("laundry.sheetItemsHint")}</p>
          <div className="staff-desk__sheet-lines">
            {DESK_SHEET_ITEMS.map((item) => (
              <div className="staff-desk__sheet-line" key={item.key}>
                <label htmlFor={`sheet-${item.key}`}>
                  {sheetItemLabel(item.key, locale)}
                </label>
                <input
                  id={`sheet-${item.key}`}
                  inputMode="numeric"
                  min={0}
                  name={`sheet-${item.key}`}
                  step={1}
                  type="number"
                />
              </div>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="field-pair">
          <label htmlFor="laundry-measure">
            {measureType === "kg" ? t("laundry.kilograms") : t("laundry.pieces")}
          </label>
          <input
            id="laundry-measure"
            inputMode="decimal"
            min={measureType === "kg" ? 0.1 : 1}
            name="measure"
            required
            step={measureType === "kg" ? 0.1 : 1}
            type="number"
          />
          <input name="type" type="hidden" value={measureType} />
        </div>
      )}

      <div className="staff-desk__field-grid">
        <div className="field-pair">
          <label htmlFor="laundry-price">{t("laundry.price")}</label>
          <input
            id="laundry-price"
            inputMode="decimal"
            min={0}
            name="price-baht"
            placeholder="0"
            required
            step="0.01"
            type="number"
          />
        </div>
        <div className="field-pair">
          <label htmlFor="laundry-status">{t("common.status")}</label>
          <select
            defaultValue="unpaid"
            id="laundry-status"
            name="status"
          >
            {DESK_LAUNDRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {laundryStatusLabel(status, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-pair">
        <label htmlFor="laundry-note">{t("common.note")}</label>
        <textarea id="laundry-note" name="staff-note" rows={3} />
      </div>
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {deskPendingLabel(pending, t("laundry.addSlip"), t("common.saving"))}
      </button>
    </>
  );
}

export function StaffDeskLaundry({
  records,
  sheetsOnly = false,
  returnTo = "/staff/laundry",
  initialOpenId = null,
}: {
  records: DeskLaundryRecord[];
  sheetsOnly?: boolean;
  returnTo?: string;
  initialOpenId?: string | null;
}) {
  const { t, locale } = useStaffLocale();
  const [category, setCategory] = useState<DeskLaundryCategory>(
    sheetsOnly ? "sheets" : "laundry",
  );
  const [measureType, setMeasureType] = useState<"kg" | "count">(
    sheetsOnly ? "count" : "kg",
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  const [creating, setCreating] = useState(false);
  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    setSelectedId(initialOpenId);
    if (initialOpenId) setCreating(false);
  }, [initialOpenId]);

  const categories = sheetsOnly
    ? (["sheets"] as const satisfies readonly DeskLaundryCategory[])
    : DESK_LAUNDRY_CATEGORIES;
  const visibleRecords = sheetsOnly
    ? records.filter((record) => record.category === "sheets")
    : records;

  function openCreate() {
    setSelectedId(null);
    setCreating(true);
    setCategory(sheetsOnly ? "sheets" : "laundry");
    setMeasureType(sheetsOnly ? "count" : "kg");
  }

  function closeDialog() {
    setSelectedId(null);
    setCreating(false);
  }

  const addButton = (
    <button className="button button--primary" onClick={openCreate} type="button">
      {t("laundry.addSlip")}
    </button>
  );

  return (
    <div className="staff-desk__list-shell">
      <div className="staff-desk__list-toolbar staff-desk__list-toolbar--slim">
        <span className="staff-desk__toolbar-meta">
          {visibleRecords.length
            ? `${visibleRecords.length}`
            : t("laundry.empty")}
        </span>
        <StaffDeskActionsMenu label={t("common.actions")}>
          <button
            className="staff-desk__actions-item"
            onClick={openCreate}
            role="menuitem"
            type="button"
          >
            {t("laundry.addSlip")}
          </button>
        </StaffDeskActionsMenu>
      </div>

      <div className="staff-desk__panel staff-desk__panel--fill">
        {visibleRecords.length ? (
          <div className="staff-desk__table-wrap staff-desk__table-wrap--fill">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.type")}</th>
                  <th>{t("laundry.measure")}</th>
                  <th>{t("laundry.price")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("laundry.sent")}</th>
                  <th>{t("laundry.received")}</th>
                  <th>
                    <span className="sr-only">{t("laundry.markReceived")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <button
                        className="staff-desk__row-open"
                        onClick={() => {
                          setCreating(false);
                          setSelectedId(record.id);
                        }}
                        type="button"
                      >
                        <strong>{record.name}</strong>
                      </button>
                    </td>
                    <td>{laundryCategoryLabel(record.category, t)}</td>
                    <td>{formatLaundryMeasure(record, locale)}</td>
                    <td>{formatSatang(record.priceSatang)}</td>
                    <td>
                      <span className={`desk-status desk-status--${record.status}`}>
                        {laundryStatusLabel(record.status, t)}
                      </span>
                    </td>
                    <td>{dateTime(record.recordedAt, locale)}</td>
                    <td>
                      {record.receivedAt
                        ? dateTime(record.receivedAt, locale)
                        : t("laundry.out")}
                    </td>
                    <td>
                      {!record.receivedAt ? (
                        <DeskQuietForm action={receiveLaundryRecord}>
                          {(pending) => (
                            <>
                              <input name="id" type="hidden" value={record.id} />
                              <input name="return-to" type="hidden" value={returnTo} />
                              <button
                                className="button button--secondary button--compact"
                                disabled={pending}
                                onClick={(event) => event.stopPropagation()}
                                type="submit"
                              >
                                {deskPendingLabel(
                                  pending,
                                  t("laundry.markReceived"),
                                  "…",
                                )}
                              </button>
                            </>
                          )}
                        </DeskQuietForm>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("laundry.empty")}</h2>
            <p>{t("laundry.emptyHint")}</p>
            {addButton}
          </div>
        )}
      </div>

      <StaffDialog
        onClose={closeDialog}
        open={creating || Boolean(selected)}
        title={
          creating
            ? t("laundry.add")
            : selected
              ? selected.name
              : t("laundry.slip")
        }
        footer={
          selected && !creating ? (
            <DeskQuietForm
              action={deleteLaundryRecord}
              onSuccess={closeDialog}
            >
              {(pending) => (
                <>
                  <input name="id" type="hidden" value={selected.id} />
                  <input name="return-to" type="hidden" value={returnTo} />
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
        {creating ? (
          <DeskQuietForm
            action={createLaundryRecord}
            className="staff-desk__form staff-desk__form--dialog"
            resetOnSuccess
            onSuccess={() => {
              setCategory(sheetsOnly ? "sheets" : "laundry");
              setMeasureType(sheetsOnly ? "count" : "kg");
              closeDialog();
            }}
          >
            {(pending) => (
              <>
                <input name="return-to" type="hidden" value={returnTo} />
                <LaundryCreateFields
                  categories={categories}
                  category={category}
                  locale={locale}
                  measureType={measureType}
                  pending={pending}
                  setCategory={setCategory}
                  setMeasureType={setMeasureType}
                  sheetsOnly={sheetsOnly}
                  t={t}
                />
              </>
            )}
          </DeskQuietForm>
        ) : selected ? (
          <DeskQuietForm
            action={updateLaundryRecord}
            className="staff-desk__form staff-desk__form--dialog"
            onSuccess={closeDialog}
          >
            {(pending) => (
              <>
                <input name="id" type="hidden" value={selected.id} />
                <input name="return-to" type="hidden" value={returnTo} />
                <input name="name" type="hidden" value={selected.name} />
                <input name="category" type="hidden" value={selected.category} />
                <input name="grams" type="hidden" value={selected.grams ?? ""} />
                <input name="count" type="hidden" value={selected.count ?? ""} />
                {selected.lines.map((line) => (
                  <input
                    key={line.key}
                    name={`sheet-${line.key}`}
                    type="hidden"
                    value={line.quantity}
                  />
                ))}
                <dl className="staff-desk__details">
                  <div>
                    <dt>{t("laundry.category")}</dt>
                    <dd>{laundryCategoryLabel(selected.category, t)}</dd>
                  </div>
                  <div>
                    <dt>{t("laundry.measure")}</dt>
                    <dd>{formatLaundryMeasure(selected, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t("laundry.sent")}</dt>
                    <dd>{dateTime(selected.recordedAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t("laundry.received")}</dt>
                    <dd>
                      {selected.receivedAt
                        ? dateTime(selected.receivedAt, locale)
                        : t("laundry.out")}
                    </dd>
                  </div>
                </dl>
                <div className="staff-desk__field-grid">
                  <div className="field-pair">
                    <label htmlFor="slip-price">{t("laundry.price")}</label>
                    <input
                      defaultValue={satangToBaht(selected.priceSatang)}
                      id="slip-price"
                      inputMode="decimal"
                      min={0}
                      name="price-baht"
                      required
                      step="0.01"
                      type="number"
                    />
                  </div>
                  <div className="field-pair">
                    <label htmlFor="slip-status">{t("laundry.updateStatus")}</label>
                    <select
                      defaultValue={selected.status}
                      id="slip-status"
                      name="status"
                    >
                      {DESK_LAUNDRY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {laundryStatusLabel(status, t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field-pair">
                  <label htmlFor="slip-note">{t("common.note")}</label>
                  <textarea
                    defaultValue={selected.staffNote ?? ""}
                    id="slip-note"
                    name="staff-note"
                    rows={3}
                  />
                </div>
                <button
                  className="button button--secondary"
                  disabled={pending}
                  type="submit"
                >
                  {deskPendingLabel(pending, t("common.save"), t("common.saving"))}
                </button>
              </>
            )}
          </DeskQuietForm>
        ) : null}
      </StaffDialog>
    </div>
  );
}
