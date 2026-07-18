import Link from "next/link";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffSidebar } from "@/components/staff-sidebar";
import { StaffTourAddForm } from "@/components/staff-tour-add-form";
import { StaffTourEditForm } from "@/components/staff-tour-edit-form";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import { getStaffTours } from "@/lib/tours";

export const dynamic = "force-dynamic";

export default async function StaffSettingsToursPage({
  searchParams,
}: {
  searchParams: Promise<{ removed?: string }>;
}) {
  await requireStaffCalendarWrite();

  const { removed } = await searchParams;
  const [tours, supabaseReady] = await Promise.all([
    getStaffTours(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

  return (
    <main className="staff-shell">
      <StaffSidebar current="settings" />

      <section className="staff-main staff-main--tours" aria-labelledby="staff-tours-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Settings · Tours</p>
            <h1 id="staff-tours-title">Tours on your guest site.</h1>
            <p>
              Card-style listings on the public <a href="/tours">tours page</a>. Add a
              photo, summary, and optional enquiry link for each experience.
            </p>
          </div>
          <Link className="button button--secondary" href="/tours">
            View tours page
          </Link>
        </div>

        <StaffSettingsNav current="tours" />

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing tours here.
          </p>
        ) : null}
        {removed === "1" ? (
          <p className="form-message form-message--success" role="status">
            Tour removed.
          </p>
        ) : null}

        <div className="staff-tours-stack">
          {tours.map((tour) => (
            <StaffTourEditForm disabled={!supabaseReady} key={tour.id} tour={tour} />
          ))}
        </div>

        <section className="staff-settings-card staff-tour-add-card">
          <StaffTourAddForm disabled={!supabaseReady} tourCount={tours.length} />
        </section>
      </section>
    </main>
  );
}
