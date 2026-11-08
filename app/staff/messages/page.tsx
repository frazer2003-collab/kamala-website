import Link from "next/link";
import { StaffShell } from "@/components/staff-shell";
import { listStaffMessageThreads } from "@/lib/booking-chat";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffMessagesPage() {
  await requireStaffSession();
  const locale = await getStaffLocale();
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
          <div className="staff-desk__list-shell">
            <div className="staff-desk__panel staff-desk__panel--fill">
              {threads.length ? (
                <div className="staff-desk__table-wrap staff-desk__table-wrap--fill">
                  <table className="staff-desk__table">
                    <thead>
                      <tr>
                        <th>{staffT(locale, "common.name")}</th>
                        <th>{staffT(locale, "common.room")}</th>
                        <th>{staffT(locale, "messages.latest")}</th>
                        <th>{staffT(locale, "common.status")}</th>
                        <th>
                          <span className="sr-only">
                            {staffT(locale, "messages.openChat")}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {threads.map((thread) => (
                        <tr
                          className={
                            thread.needsReply
                              ? "staff-desk__row--attention"
                              : undefined
                          }
                          key={thread.bookingId}
                        >
                          <td>
                            <strong>{thread.guestName}</strong>
                            {thread.needsReply ? (
                              <span
                                className="staff-desk__attn-pill"
                                title={staffT(locale, "messages.needsReply")}
                              >
                                !
                              </span>
                            ) : null}
                          </td>
                          <td>{thread.roomName}</td>
                          <td>
                            <span className="staff-desk__muted">
                              {thread.lastSender === "guest" ? "Guest" : "You"}
                              {": "}
                            </span>
                            {thread.lastBody || "—"}
                            <small className="staff-desk__muted">
                              {" "}
                              · {thread.ageLabel}
                            </small>
                          </td>
                          <td>
                            {thread.needsReply
                              ? staffT(locale, "messages.needsReply")
                              : thread.status}
                          </td>
                          <td>
                            <Link
                              className="button button--secondary button--compact"
                              href={`/staff/transfers?booking=${encodeURIComponent(thread.bookingId)}`}
                              prefetch={false}
                            >
                              {staffT(locale, "messages.openChat")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="staff-desk__empty-state">
                  <h2>{staffT(locale, "messages.empty")}</h2>
                  <p>{staffT(locale, "messages.emptyHint")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </StaffShell>
  );
}
