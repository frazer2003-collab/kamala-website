"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createLaundryRecord,
  deleteLaundryRecord,
  updateLaundryRecord,
} from "@/app/desk-actions";
import { StaffCombo } from "@/components/staff-combo";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import {
  DESK_LAUNDRY_CATEGORIES,
  DESK_LAUNDRY_STATUSES,
  formatLaundryMeasure,
  type DeskLaundryCategory,
  type DeskLaundryStatus,
} from "@/lib/desk-laundry";
import type { DeskLaundryRecord } from "@/lib/desk-ops-data";

function dateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function StaffDeskLaundry({
  records,
  sheetsOnly = false,
  returnTo = "/staff/laundry",
  initialOpenId = null,
}: {
  records: DeskLaundryRecord[];
  /** Portal mode: only sheets category can be submitted. */
  sheetsOnly?: boolean;
  returnTo?: string;
  initialOpenId?: string | null;
}) {
  const { t, locale } = useStaffLocale();
  const [measureType, setMeasureType] = useState<"kg" | "count">("count");
  const [selectedId, setSelectedId] = useState<string | null>(initialOpenId);
  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    setSelectedId(initialOpenId);
  }, [initialOpenId]);

  const categories = sheetsOnly
    ? (["sheets"] as const satisfies readonly DeskLaundryCategory[])
    : DESK_LAUNDRY_CATEGORIES;
  const categoryOptions = categories.map((category) => ({
    value: category,
    label: category,
  }));
  const statusOptions = DESK_LAUNDRY_STATUSES.map((status) => ({
    value: status,
    label: status,
  }));
  const visibleRecords = sheetsOnly
    ? records.filter((record) => record.category === "sheets")
    : records;

  return (
    <>
      <div className="staff-desk__workspace">
        <section className="staff-desk__panel" aria-labelledby="laundry-list-title">
          <header className="staff-desk__panel-head">
            <div>
              <h2 id="laundry-list-title">{t("laundry.records")}</h2>
              <p>{t("laundry.newest")}</p>
            </div>
          </header>
          {visibleRecords.length ? (
            <div className="staff-desk__table-wrap">
              <table className="staff-desk__table">
                <thead>
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("common.type")}</th>
                    <th>{t("laundry.measure")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("laundry.recorded")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => (
                    <tr
                      className="staff-desk__click-row"
                      key={record.id}
                      onClick={() => setSelectedId(record.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(record.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td>
                        <strong>{record.name}</strong>
                      </td>
                      <td>{record.category}</td>
                      <td>{formatLaundryMeasure(record)}</td>
                      <td>
                        <span className={`desk-status desk-status--${record.status}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{dateTime(record.recordedAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="staff-desk__empty">{t("laundry.empty")}</p>
          )}
        </section>

        <form action={createLaundryRecord} className="staff-desk__form">
          <input name="return-to" type="hidden" value={returnTo} />
          <h2>{t("laundry.add")}</h2>
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
                  <input id="laundry-category" name="category" readOnly value="sheets" />
                </>
              ) : (
                <StaffCombo
                  clearOnSelect={false}
                  defaultValue={DESK_LAUNDRY_CATEGORIES[0]}
                  id="laundry-category"
                  label={t("laundry.category")}
                  name="category"
                  options={categoryOptions}
                  placeholder={t("desk.typeToSearch")}
                  required
                />
              )}
            </div>
            <div className="field-pair">
              <StaffCombo
                clearOnSelect={false}
                defaultValue={"sent" satisfies DeskLaundryStatus}
                id="laundry-status"
                label={t("common.status")}
                name="status"
                options={statusOptions}
                placeholder={t("desk.typeToSearch")}
                required
              />
            </div>
          </div>
          <div className="staff-desk__field-grid">
            <div className="field-pair">
              <label htmlFor="laundry-type">{t("common.type")}</label>
              <select
                defaultValue={sheetsOnly ? "count" : "kg"}
                id="laundry-type"
                name="type"
                onChange={(event) =>
                  setMeasureType(event.target.value === "count" ? "count" : "kg")
                }
              >
                <option value="kg">{t("laundry.kilograms")}</option>
                <option value="count">{t("laundry.pieces")}</option>
              </select>
            </div>
            <div className="field-pair">
              <label htmlFor="laundry-measure">
                {measureType === "kg" ? t("laundry.kilograms") : t("laundry.pieces")}
              </label>
              {measureType === "kg" ? (
                <input
                  id="laundry-measure"
                  key="kg"
                  min="0.01"
                  name="measure"
                  required
                  step="0.01"
                  type="number"
                />
              ) : (
                <input
                  id="laundry-measure"
                  key="count"
                  min="1"
                  name="measure"
                  required
                  step="1"
                  type="number"
                />
              )}
            </div>
          </div>
          <div className="field-pair">
            <label htmlFor="laundry-note">{t("common.note")}</label>
            <textarea id="laundry-note" name="staff-note" rows={3} />
          </div>
          <button className="button button--primary" type="submit">
            {t("laundry.addSlip")}
          </button>
        </form>
      </div>

      <StaffDialog
        onClose={() => setSelectedId(null)}
        open={Boolean(selected)}
        title={selected ? selected.name : t("laundry.slip")}
        footer={
          selected ? (
            <form action={deleteLaundryRecord}>
              <input name="id" type="hidden" value={selected.id} />
              <input name="return-to" type="hidden" value={returnTo} />
              <button className="button button--quiet" type="submit">
                {t("common.delete")}
              </button>
            </form>
          ) : null
        }
      >
        {selected ? (
          <form action={updateLaundryRecord} className="staff-desk__form staff-desk__form--dialog">
            <input name="id" type="hidden" value={selected.id} />
            <input name="return-to" type="hidden" value={returnTo} />
            <input name="name" type="hidden" value={selected.name} />
            <input name="category" type="hidden" value={selected.category} />
            <input name="grams" type="hidden" value={selected.grams ?? ""} />
            <input name="count" type="hidden" value={selected.count ?? ""} />
            <dl className="staff-desk__details">
              <div>
                <dt>{t("laundry.category")}</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>{t("laundry.measure")}</dt>
                <dd>{formatLaundryMeasure(selected)}</dd>
              </div>
              <div>
                <dt>{t("laundry.recorded")}</dt>
                <dd>{dateTime(selected.recordedAt, locale)}</dd>
              </div>
            </dl>
            <div className="field-pair">
              <label htmlFor="slip-note">{t("common.note")}</label>
              <textarea
                defaultValue={selected.staffNote ?? ""}
                id="slip-note"
                name="staff-note"
                rows={3}
              />
            </div>
            <div className="field-pair">
              <label htmlFor="slip-status">{t("laundry.updateStatus")}</label>
              <select defaultValue={selected.status} id="slip-status" name="status">
                {DESK_LAUNDRY_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            <button className="button button--secondary" type="submit">
              {t("common.save")}
            </button>
          </form>
        ) : null}
      </StaffDialog>
    </>
  );
}
