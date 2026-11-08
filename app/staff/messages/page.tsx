import { StaffMessagesList } from "@/components/staff-messages-list";
import { StaffShell } from "@/components/staff-shell";
import { listStaffMessageThreads } from "@/lib/booking-chat";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const threads = hasStaffSupabaseConfig()
    ? await listStaffMessageThreads()
    : [];

  return (
    <StaffShell current="messages">
      <section
        className="staff-main staff-desk staff-desk--fill"
        aria-labelledby="staff-messages-title"
      >
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="staff-messages-title">{staffT(locale, "messages.title")}</h1>
          </div>
        </header>

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffMessagesList
            initialOpenId={params.open ?? null}
            threads={threads}
          />
        )}
      </section>
    </StaffShell>
  );
}
