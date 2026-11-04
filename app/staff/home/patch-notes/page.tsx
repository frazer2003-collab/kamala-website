import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { requireStaffSessionDetails } from "@/lib/staff-auth";
import {
  formatStaffPatchDate,
  STAFF_PATCH_NOTES,
} from "@/lib/staff-patch-notes";

export const dynamic = "force-dynamic";

export default async function StaffPatchNotesPage() {
  await requireStaffSessionDetails();

  return (
    <StaffShell current="home">
      <section className="staff-main" aria-labelledby="patch-notes-title">
        <div className="staff-header staff-header--compact">
          <div>
            <p className="staff-home__back">
              <Link href="/staff/home">← Home</Link>
            </p>
            <h1 id="patch-notes-title">Patch notes</h1>
            <p className="staff-home__lede">
              What changed in staff tools, newest first.
            </p>
          </div>
        </div>

        <ol className="staff-patch-list">
          {STAFF_PATCH_NOTES.map((note) => (
            <li className="staff-patch-entry" key={note.id}>
              <header className="staff-patch-entry__header">
                <time dateTime={note.date}>{formatStaffPatchDate(note.date)}</time>
                <h2>{note.title}</h2>
                <p>{note.summary}</p>
              </header>
              <ul>
                {note.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </StaffShell>
  );
}
