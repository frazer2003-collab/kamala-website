import Link from "next/link";
import {
  createLaundryRecord,
  updateLaundryRecord,
} from "@/app/desk-actions";
import { StaffShell } from "@/components/staff-shell";
import { listDeskLaundry } from "@/lib/desk-ops-data";
import {
  DESK_LAUNDRY_CATEGORIES,
  DESK_LAUNDRY_STATUSES,
  formatLaundryMeasure,
} from "@/lib/desk-laundry";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

function dateTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function StaffLaundryPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireStaffSession();
  const { open } = await searchParams;
  const records = await listDeskLaundry();
  const opened = records.find((record) => record.id === open) ?? null;

  return (
    <StaffShell current="laundry">
      <section className="staff-main staff-desk" aria-labelledby="desk-laundry-title">
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-laundry-title">Laundry</h1>
            <p>Record each bag or sheet count, then update the slip when it returns.</p>
          </div>
        </header>

        <div className="staff-desk__workspace">
          <section className="staff-desk__panel" aria-labelledby="laundry-list-title">
            <header className="staff-desk__panel-head">
              <div><h2 id="laundry-list-title">Laundry records</h2><p>Newest first.</p></div>
            </header>
            {records.length ? (
              <div className="staff-desk__table-wrap">
                <table className="staff-desk__table">
                  <thead><tr><th>Name</th><th>Type</th><th>Measure</th><th>Status</th><th>Recorded</th></tr></thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td><Link href={`/staff/laundry?open=${record.id}`}>{record.name}</Link></td>
                        <td>{record.category}</td>
                        <td>{formatLaundryMeasure(record)}</td>
                        <td><span className={`desk-status desk-status--${record.status}`}>{record.status}</span></td>
                        <td>{dateTime(record.recordedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="staff-desk__empty">No laundry slips yet.</p>}
          </section>

          <form action={createLaundryRecord} className="staff-desk__form">
            <h2>Add laundry</h2>
            <div className="field-pair">
              <label htmlFor="laundry-name">Name</label>
              <input id="laundry-name" name="name" placeholder="Room, guest, or batch" required />
            </div>
            <div className="staff-desk__field-grid">
              <div className="field-pair">
                <label htmlFor="laundry-category">Category</label>
                <select id="laundry-category" name="category">
                  {DESK_LAUNDRY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div className="field-pair">
                <label htmlFor="laundry-status">Status</label>
                <select id="laundry-status" name="status">
                  {DESK_LAUNDRY_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            </div>
            <div className="staff-desk__field-grid">
              <div className="field-pair">
                <label htmlFor="laundry-measure-type">Measure by</label>
                <select defaultValue="kg" id="laundry-measure-type" name="measure-type">
                  <option value="kg">Kilograms</option>
                  <option value="count">Piece count</option>
                </select>
              </div>
              <div className="field-pair">
                <label htmlFor="laundry-kg">Kilograms</label>
                <input id="laundry-kg" min="0.01" name="kg" step="0.01" type="number" />
              </div>
              <div className="field-pair">
                <label htmlFor="laundry-count">Piece count</label>
                <input id="laundry-count" min="1" name="count" type="number" />
              </div>
            </div>
            <div className="field-pair">
              <label htmlFor="laundry-note">Note</label>
              <textarea id="laundry-note" name="staff-note" rows={3} />
            </div>
            <button className="button button--primary" type="submit">Add slip</button>
          </form>
        </div>

        {opened ? (
          <section className="staff-desk__slip" aria-labelledby="laundry-slip-title">
            <header>
              <div>
                <p>Laundry slip</p>
                <h2 id="laundry-slip-title">{opened.name}</h2>
              </div>
              <Link className="button button--quiet" href="/staff/laundry">Close</Link>
            </header>
            <dl>
              <div><dt>Category</dt><dd>{opened.category}</dd></div>
              <div><dt>Measure</dt><dd>{formatLaundryMeasure(opened)}</dd></div>
              <div><dt>Recorded</dt><dd>{dateTime(opened.recordedAt)}</dd></div>
              <div><dt>Note</dt><dd>{opened.staffNote || "No note"}</dd></div>
            </dl>
            <form action={updateLaundryRecord} className="staff-desk__inline-form">
              <input name="id" type="hidden" value={opened.id} />
              <input name="name" type="hidden" value={opened.name} />
              <input name="category" type="hidden" value={opened.category} />
              <input name="grams" type="hidden" value={opened.grams ?? ""} />
              <input name="count" type="hidden" value={opened.count ?? ""} />
              <input name="staff-note" type="hidden" value={opened.staffNote ?? ""} />
              <div className="field-pair">
                <label htmlFor="slip-status">Update status</label>
                <select defaultValue={opened.status} id="slip-status" name="status">
                  {DESK_LAUNDRY_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <button className="button button--secondary" type="submit">Save status</button>
            </form>
          </section>
        ) : null}
      </section>
    </StaffShell>
  );
}
