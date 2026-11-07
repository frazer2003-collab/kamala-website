import Link from "next/link";
import { createBill } from "@/app/desk-actions";
import { StaffShell } from "@/components/staff-shell";
import { listDeskSellables } from "@/lib/desk-ops-data";
import { bilingualItemLabel } from "@/lib/desk-items";
import { formatSatang } from "@/lib/desk-money";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function NewStaffBillPage() {
  await requireStaffSession();
  const sellables = (await listDeskSellables()).filter((item) => item.active);

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk" aria-labelledby="new-bill-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="new-bill-title">New bill</h1>
            <p>Name the tab and optionally add its first item.</p>
          </div>
          <Link className="button button--secondary" href="/staff/bills">Back to bills</Link>
        </header>

        <form action={createBill} className="staff-desk__form staff-desk__form--narrow">
          <div className="field-pair">
            <label htmlFor="new-bill-name">Name</label>
            <input autoFocus id="new-bill-name" name="name" placeholder="Guest or table name" required />
          </div>
          <div className="field-pair">
            <label htmlFor="new-bill-room">Room (optional)</label>
            <input id="new-bill-room" name="room" placeholder="For example 204" />
          </div>
          <div className="field-pair">
            <label htmlFor="new-bill-item">First item (optional)</label>
            <select id="new-bill-item" name="sellable-item-id">
              <option value="">Save an empty bill</option>
              {sellables.map((item) => (
                <option key={item.id} value={item.id}>
                  {bilingualItemLabel(item)} - {formatSatang(item.priceSatang)}
                </option>
              ))}
            </select>
          </div>
          <div className="field-pair staff-desk__quantity">
            <label htmlFor="new-bill-quantity">Quantity</label>
            <input defaultValue="1" id="new-bill-quantity" min="1" name="quantity" type="number" />
          </div>
          <div className="staff-desk__form-actions">
            <button className="button button--primary" type="submit">Save open bill</button>
          </div>
        </form>
      </section>
    </StaffShell>
  );
}
