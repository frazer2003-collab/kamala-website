import Link from "next/link";
import { removeStaffNotificationEmail } from "@/app/staff/auth-actions";
import { StaffEmailAccessForm } from "@/components/staff-email-access-form";
import { StaffHeroImageField } from "@/components/staff-hero-image-field";
import { StaffPropertySettingsForm } from "@/components/staff-property-settings-form";
import { StaffSettingsAddForm } from "@/components/staff-settings-add-form";
import { StaffSettingsNav } from "@/components/staff-settings-nav";
import { StaffSidebar } from "@/components/staff-sidebar";
import { getPropertySettings } from "@/lib/property-settings";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffNotificationEmails } from "@/lib/staff-notification-emails";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatAddedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function StaffSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaffSession();

  const { saved, error } = await searchParams;
  const [emails, settings, supabaseReady] = await Promise.all([
    getStaffNotificationEmails(),
    getPropertySettings(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);
  const fallbackEmail = process.env.STAFF_NOTIFICATION_EMAIL?.trim();

  return (
    <main className="staff-shell">
      <StaffSidebar current="settings" />

      <section className="staff-main" aria-labelledby="staff-settings-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Staff settings</p>
            <h1 id="staff-settings-title">Property and notification settings.</h1>
            <p>
              Set your guesthouse name, policies, currency, notification emails,
              and manage room types and tours from the tabs below.
            </p>
          </div>
          <Link className="button button--secondary" href="/staff">
            Back to requests
          </Link>
        </div>

        <StaffSettingsNav current="general" />

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing settings here.
          </p>
        ) : null}

        <section className="staff-settings-card" aria-labelledby="hero-image-title">
          <h2 id="hero-image-title">Homepage background</h2>
          <p className="staff-settings-calendar-colors__hint">
            A wide photo of the guesthouse shown behind the date search on the home page.
          </p>
          <StaffHeroImageField disabled={!supabaseReady} heroImageUrl={settings.heroImageUrl} />
        </section>

        <section className="staff-settings-card" aria-labelledby="property-settings-title">
          <h2 id="property-settings-title">Property details</h2>
          <StaffPropertySettingsForm disabled={!supabaseReady} settings={settings} />
        </section>

        {saved === "calendar-access" ? (
          <p className="form-message form-message--success" role="status">
            Calendar access updated.
          </p>
        ) : null}
        {error === "calendar-access" ? (
          <p className="form-message form-message--error" role="alert">
            Could not update calendar access. Run{" "}
            <code>supabase/migrate-staff-calendar-access.sql</code> in Supabase if you
            have not already.
          </p>
        ) : null}

        <div className="staff-settings-grid">
          <section className="staff-settings-card" aria-labelledby="add-email-title">
            <h2 id="add-email-title">Add staff email</h2>
            <p className="staff-settings-calendar-colors__hint">
              Read &amp; write staff get booking alerts and can edit the calendar.
              Read only staff can view the calendar when signed in, but do not receive
              booking emails.
            </p>
            <StaffSettingsAddForm disabled={!supabaseReady} />
          </section>

          <section className="staff-settings-card" aria-labelledby="email-list-title">
            <div className="booking-list__header">
              <h2 id="email-list-title">Current recipients</h2>
              <span>{emails.length} saved</span>
            </div>

            {emails.length > 0 ? (
              <ul className="staff-email-list">
                {emails.map((entry) => (
                  <li className="staff-email-list__item" key={entry.id}>
                    <div>
                      <strong>{entry.email}</strong>
                      {entry.label ? <span>{entry.label}</span> : null}
                      <small>Added {formatAddedAt(entry.created_at)}</small>
                    </div>
                    <div className="staff-email-list__actions">
                      <StaffEmailAccessForm
                        calendarAccess={entry.calendarAccess}
                        disabled={!supabaseReady}
                        emailId={entry.id}
                      />
                      <form action={removeStaffNotificationEmail}>
                        <input name="email-id" type="hidden" value={entry.id} />
                        <button className="button button--quiet" type="submit">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="staff-empty-state staff-empty-state--compact">
                <h3>No saved emails yet.</h3>
                <p>
                  {fallbackEmail
                    ? `Booking alerts still go to ${fallbackEmail} from your environment until you add addresses here.`
                    : "Add at least one email, or set STAFF_NOTIFICATION_EMAIL in your environment."}
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
