"use client";

import { createExpense, deleteExpense } from "@/app/desk-actions";
import {
  DeskQuietForm,
  deskPendingLabel,
} from "@/components/desk-quiet-form";
import { useStaffLocale } from "@/components/staff-locale";
import { formatSatang } from "@/lib/desk-money";
import type { DeskExpense } from "@/lib/desk-ops-data";

function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export function StaffDeskExpenses({
  expenses,
  totalSatang,
  truncated,
  fromIso,
  toIso,
  todayIso,
  returnTo,
}: {
  expenses: DeskExpense[];
  totalSatang: number;
  truncated: boolean;
  fromIso: string;
  toIso: string;
  todayIso: string;
  returnTo: string;
}) {
  const { t, locale } = useStaffLocale();

  return (
    <div className="staff-desk__expenses">
      <DeskQuietForm
        action={createExpense}
        className="staff-desk__form staff-desk__form--strip"
        resetOnSuccess
      >
        {(pending) => (
          <>
            <input name="return-to" type="hidden" value={returnTo} />
            <h2>{t("expenses.add")}</h2>
            <div className="staff-desk__field-grid">
              <div className="field-pair staff-desk__grow">
                <label htmlFor="expense-name">{t("expenses.chargeName")}</label>
                <input
                  autoFocus
                  id="expense-name"
                  name="name"
                  placeholder={t("expenses.chargePlaceholder")}
                  required
                />
              </div>
              <div className="field-pair">
                <label htmlFor="expense-amount">{t("expenses.cost")}</label>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  min="0"
                  name="amount-baht"
                  placeholder="0"
                  required
                  step="0.01"
                  type="number"
                />
              </div>
              <div className="field-pair">
                <label htmlFor="expense-date">{t("common.date")}</label>
                <input
                  defaultValue={todayIso}
                  id="expense-date"
                  max={todayIso}
                  name="expense-date"
                  required
                  type="date"
                />
              </div>
            </div>
            <div className="field-pair">
              <label htmlFor="expense-note">{t("expenses.note")}</label>
              <input
                id="expense-note"
                name="staff-note"
                placeholder={t("expenses.notePlaceholder")}
              />
            </div>
            <button
              className="button button--primary"
              disabled={pending}
              type="submit"
            >
              {deskPendingLabel(pending, t("expenses.save"), t("common.saving"))}
            </button>
          </>
        )}
      </DeskQuietForm>

      {truncated ? (
        <p className="form-message" role="status">
          {t("expenses.truncated")}
        </p>
      ) : null}

      <div className="staff-desk__panel">
        {expenses.length ? (
          <div className="staff-desk__table-wrap">
            <table className="staff-desk__table">
              <thead>
                <tr>
                  <th>{t("expenses.chargeName")}</th>
                  <th>{t("common.date")}</th>
                  <th>{t("expenses.cost")}</th>
                  <th>{t("expenses.note")}</th>
                  <th>
                    <span className="sr-only">{t("common.remove")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.name}</strong>
                      {expense.actedBy ? (
                        <small className="staff-desk__muted">
                          {" "}
                          · {expense.actedBy}
                        </small>
                      ) : null}
                    </td>
                    <td>{formatDay(expense.expenseDate, locale)}</td>
                    <td>{formatSatang(expense.amountSatang)}</td>
                    <td>{expense.staffNote || "—"}</td>
                    <td>
                      <DeskQuietForm action={deleteExpense}>
                        {(pending) => (
                          <>
                            <input name="id" type="hidden" value={expense.id} />
                            <input
                              name="return-to"
                              type="hidden"
                              value={returnTo}
                            />
                            <button
                              className="button button--quiet"
                              disabled={pending}
                              type="submit"
                            >
                              {deskPendingLabel(
                                pending,
                                t("common.remove"),
                                "…",
                              )}
                            </button>
                          </>
                        )}
                      </DeskQuietForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("expenses.empty")}</h2>
            <p>{t("expenses.emptyHint")}</p>
          </div>
        )}

        <footer className="staff-desk__sum-bar" aria-live="polite">
          <span>
            {t("expenses.rangeTotal")}
            {fromIso !== toIso
              ? ` · ${formatDay(fromIso, locale)} → ${formatDay(toIso, locale)}`
              : ""}
          </span>
          <strong>{formatSatang(totalSatang)}</strong>
        </footer>
      </div>
    </div>
  );
}
