import Link from "next/link";
import {
  addBillLine,
  clearBill,
  removeBillLine,
} from "@/app/desk-actions";
import { StaffShell } from "@/components/staff-shell";
import { billTotalSatang } from "@/lib/desk-bills";
import {
  listDeskBills,
  listDeskSellables,
} from "@/lib/desk-ops-data";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang } from "@/lib/desk-money";
import { requireStaffSession } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

export default async function StaffBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; q?: string }>;
}) {
  await requireStaffSession();
  const params = await searchParams;
  const [bills, sellables] = await Promise.all([
    listDeskBills(),
    listDeskSellables(),
  ]);
  const selected =
    bills.find((bill) => bill.id === params.id) ?? bills[0] ?? null;
  const sellablesById = new Map(sellables.map((item) => [item.id, item]));
  const query = (params.q ?? "").trim().toLowerCase();
  const available = sellables.filter(
    (item) =>
      item.active &&
      (!query ||
        item.nameEn.toLowerCase().includes(query) ||
        item.nameTh.toLowerCase().includes(query)),
  );

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk" aria-labelledby="desk-bills-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-bills-title">Bills</h1>
            <p>Keep open tabs, add desk items, then clear once payment is settled.</p>
          </div>
          <Link className="button button--primary" href="/staff/bills/new">
            New bill
          </Link>
        </header>

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <div className="staff-desk__split">
            <aside className="staff-desk__rail" aria-label="Bills">
              {bills.length ? (
                <ul className="staff-desk__rail-list">
                  {bills.map((bill) => (
                    <li key={bill.id}>
                      <Link
                        aria-current={selected?.id === bill.id ? "page" : undefined}
                        href={`/staff/bills?id=${bill.id}`}
                      >
                        <span>
                          <strong>{bill.name}</strong>
                          <small>{formatDate(bill.serviceDate)}</small>
                        </span>
                        <span className={`desk-status desk-status--${bill.status}`}>
                          {bill.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="staff-desk__empty">No bills yet.</p>
              )}
            </aside>

            <div className="staff-desk__panel">
              {selected ? (
                <>
                  <header className="staff-desk__panel-head">
                    <div>
                      <h2>{selected.name}</h2>
                      <p>
                        {selected.room ? `Room ${selected.room}. ` : ""}
                        {formatDate(selected.serviceDate)}
                      </p>
                    </div>
                    <strong className="staff-desk__total">
                      {formatSatang(billTotalSatang(selected.lines, sellables))}
                    </strong>
                  </header>

                  {selected.lines.length ? (
                    <div className="staff-desk__table-wrap">
                      <table className="staff-desk__table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Amount</th>
                            <th><span className="sr-only">Actions</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.lines.map((line) => {
                            const item = sellablesById.get(line.sellableItemId);
                            return (
                              <tr key={line.id}>
                                <td>{item ? bilingualItemLabel(item) : "Removed item"}</td>
                                <td>{line.quantity}</td>
                                <td>
                                  {item
                                    ? formatSatang(item.priceSatang * line.quantity)
                                    : "-"}
                                </td>
                                <td>
                                  {selected.status === "open" ? (
                                    <form action={removeBillLine}>
                                      <input name="bill-id" type="hidden" value={selected.id} />
                                      <input name="line-id" type="hidden" value={line.id} />
                                      <button className="button button--quiet" type="submit">
                                        Remove
                                      </button>
                                    </form>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="staff-desk__empty">No lines on this bill yet.</p>
                  )}

                  {selected.status === "open" ? (
                    <div className="staff-desk__actions">
                      <form action={addBillLine} className="staff-desk__inline-form">
                        <input name="bill-id" type="hidden" value={selected.id} />
                        <div className="field-pair staff-desk__grow">
                          <label htmlFor="bill-item">Add item</label>
                          <select id="bill-item" name="sellable-item-id" required>
                            <option value="">Choose an item</option>
                            {available.map((item) => (
                              <option key={item.id} value={item.id}>
                                {bilingualItemLabel(item)} - {formatSatang(item.priceSatang)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field-pair staff-desk__quantity">
                          <label htmlFor="bill-quantity">Qty</label>
                          <input defaultValue="1" id="bill-quantity" min="1" name="quantity" required type="number" />
                        </div>
                        <button className="button button--secondary" type="submit">Add</button>
                      </form>
                      <form action={clearBill}>
                        <input name="bill-id" type="hidden" value={selected.id} />
                        <button className="button button--primary" type="submit">
                          Clear bill
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="form-message form-message--success" role="status">
                      Cleared {selected.clearedAt ? formatDate(selected.clearedAt.slice(0, 10)) : ""}.
                    </p>
                  )}
                </>
              ) : (
                <div className="staff-desk__empty-state">
                  <h2>No open desk bill</h2>
                  <p>Create a bill to start a tab.</p>
                  <Link className="button button--primary" href="/staff/bills/new">New bill</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </StaffShell>
  );
}
