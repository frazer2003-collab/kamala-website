"use client";

import { createExpense, deleteExpense } from "@/app/desk-actions";
import { useStaffLocale } from "@/components/staff-locale";
import { formatSatang } from "@/lib/desk-money";
import type { DeskExpense } from "@/lib/desk-ops-data";

function formatDay(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
    weekday: "short",
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

  const grouped = new Map<string, DeskExpense[]>();
  for (const expense of expenses) {
    const bucket = grouped.get(expense.expenseDate) ?? [];
    bucket.push(expense);
    grouped.set(expense.expenseDate, bucket);
  }
  const days = Array.from(grouped.keys());

  return (
    <div className="staff-desk__expenses">
      <form action={createExpense} className="staff-desk__form staff-desk__expense-create">
        <input name="return-to" type="hidden" value={returnTo} />
        <h2>{t("expenses.add")}</h2>
        <div className="staff-desk__field-grid">
          <div className="field-pair staff-desk__grow">
            <label htmlFor="expense-name">{t("expenses.chargeName")}</label>
            <input
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
            <label htmlFor="expense-date">{t("expenses.date")}</label>
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
        <button className="button button--primary" type="submit">
          {t("expenses.save")}
        </button>
      </form>

      <section className="staff-desk__panel" aria-labelledby="expense-list-title">
        <header className="staff-desk__panel-head">
          <div>
            <h2 id="expense-list-title">{t("expenses.records")}</h2>
            <p>
              {fromIso === toIso
                ? formatDay(fromIso, locale)
                : `${formatDay(fromIso, locale)} → ${formatDay(toIso, locale)}`}
            </p>
          </div>
          <span>
            {expenses.length} {t("expenses.entries")}
          </span>
        </header>

        {truncated ? (
          <p className="form-message" role="status">
            {t("expenses.truncated")}
          </p>
        ) : null}

        {expenses.length ? (
          <div className="staff-desk__expense-days">
            {days.map((day) => {
              const rows = grouped.get(day) ?? [];
              const dayTotal = rows.reduce((sum, row) => sum + row.amountSatang, 0);
              return (
                <section
                  aria-labelledby={`expense-day-${day}`}
                  className="staff-desk__expense-day"
                  key={day}
                >
                  <header className="staff-desk__expense-day-head">
                    <h3 id={`expense-day-${day}`}>{formatDay(day, locale)}</h3>
                    <strong>{formatSatang(dayTotal)}</strong>
                  </header>
                  <div className="staff-desk__table-wrap">
                    <table className="staff-desk__table">
                      <thead>
                        <tr>
                          <th>{t("expenses.chargeName")}</th>
                          <th>{t("expenses.cost")}</th>
                          <th>{t("expenses.note")}</th>
                          <th>
                            <span className="sr-only">{t("common.remove")}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((expense) => (
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
                            <td>{formatSatang(expense.amountSatang)}</td>
                            <td>{expense.staffNote || "—"}</td>
                            <td>
                              <form action={deleteExpense}>
                                <input name="id" type="hidden" value={expense.id} />
                                <input
                                  name="return-to"
                                  type="hidden"
                                  value={returnTo}
                                />
                                <button
                                  className="button button--quiet"
                                  type="submit"
                                >
                                  {t("common.remove")}
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("expenses.empty")}</h2>
            <p>{t("expenses.emptyHint")}</p>
          </div>
        )}

        <footer className="staff-desk__sum-bar" aria-live="polite">
          <span>{t("expenses.rangeTotal")}</span>
          <strong>{formatSatang(totalSatang)}</strong>
        </footer>
      </section>
    </div>
  );
}
