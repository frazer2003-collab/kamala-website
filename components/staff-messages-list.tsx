"use client";

import { useEffect, useState } from "react";
import { BookingChat } from "@/components/booking-chat";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import type { StaffMessageThread } from "@/lib/booking-chat";

export function StaffMessagesList({
  threads,
  initialOpenId = null,
}: {
  threads: StaffMessageThread[];
  initialOpenId?: string | null;
}) {
  const { t } = useStaffLocale();
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const selected = threads.find((thread) => thread.bookingId === openId) ?? null;

  useEffect(() => {
    setOpenId(initialOpenId);
  }, [initialOpenId]);

  function softUrl(next: string) {
    window.history.replaceState(null, "", next);
  }

  function openThread(id: string) {
    setOpenId(id);
    softUrl(`/staff/messages?open=${encodeURIComponent(id)}`);
  }

  function closeThread() {
    setOpenId(null);
    softUrl("/staff/messages");
  }

  return (
    <>
      <div className="staff-desk__list-shell">
        <div className="staff-desk__panel staff-desk__panel--fill">
          {threads.length ? (
            <div className="staff-desk__table-wrap staff-desk__table-wrap--fill">
              <table className="staff-desk__table">
                <thead>
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("common.room")}</th>
                    <th>{t("messages.latest")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {threads.map((thread) => (
                    <tr
                      className={[
                        "staff-desk__click-row",
                        thread.needsReply ? "staff-desk__row--attention" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={thread.bookingId}
                      onClick={() => openThread(thread.bookingId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openThread(thread.bookingId);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td>
                        <strong>{thread.guestName}</strong>
                        {thread.needsReply ? (
                          <span
                            className="staff-desk__attn-pill"
                            title={t("messages.needsReply")}
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
                          ? t("messages.needsReply")
                          : thread.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="staff-desk__empty-state">
              <h2>{t("messages.empty")}</h2>
              <p>{t("messages.emptyHint")}</p>
            </div>
          )}
        </div>
      </div>

      <StaffDialog
        closeLabel={t("common.close")}
        onClose={closeThread}
        open={Boolean(selected)}
        title={selected ? selected.guestName : t("messages.title")}
      >
        {selected ? (
          <div className="staff-messages-chatbox">
            <p className="staff-desk__muted">
              {selected.roomName}
              {selected.needsReply ? ` · ${t("messages.needsReply")}` : ""}
            </p>
            <BookingChat
              bookingId={selected.bookingId}
              showHeading={false}
              variant="staff"
            />
          </div>
        ) : null}
      </StaffDialog>
    </>
  );
}
