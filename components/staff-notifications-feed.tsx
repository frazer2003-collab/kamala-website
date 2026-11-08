"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { markNotificationRead } from "@/app/staff/notification-actions";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import {
  formatNotificationAge,
  notificationKindLabel,
  type StaffDeskNotification,
} from "@/lib/staff-desk-notifications";

function formatStay(arrival: string | null, departure: string | null) {
  if (!arrival) return null;
  if (!departure || departure === arrival) return arrival;
  return `${arrival} → ${departure}`;
}

export function StaffNotificationsFeed({
  notifications,
  initialOpenId = null,
}: {
  notifications: StaffDeskNotification[];
  initialOpenId?: string | null;
}) {
  const { t } = useStaffLocale();
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [items, setItems] = useState(notifications);
  const selected = useMemo(
    () => items.find((row) => row.id === openId) ?? null,
    [items, openId],
  );

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    setOpenId(initialOpenId);
  }, [initialOpenId]);

  function softUrl(next: string) {
    window.history.replaceState(null, "", next);
  }

  async function openNotice(id: string) {
    setOpenId(id);
    softUrl(`/staff/transfers?open=${encodeURIComponent(id)}`);
    setItems((current) =>
      current.map((row) =>
        row.id === id && !row.readAt
          ? { ...row, readAt: new Date().toISOString() }
          : row,
      ),
    );
    try {
      await markNotificationRead(id);
    } catch {
      /* non-blocking */
    }
  }

  function closeNotice() {
    setOpenId(null);
    softUrl("/staff/transfers");
  }

  return (
    <div className="staff-desk__list-shell">
      <div className="staff-desk__panel staff-desk__panel--fill">
        {items.length ? (
          <ul className="staff-notice-feed">
            {items.map((notice) => {
              const stay = formatStay(notice.stayArrival, notice.stayDeparture);
              return (
                <li key={notice.id}>
                  <button
                    className={[
                      "staff-notice-card",
                      notice.readAt ? "" : "staff-notice-card--unread",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => openNotice(notice.id)}
                    type="button"
                  >
                    <span className="staff-notice-card__kind">
                      {notificationKindLabel(notice.kind)}
                    </span>
                    <strong className="staff-notice-card__title">
                      {notice.title}
                    </strong>
                    {notice.body ? (
                      <span className="staff-notice-card__body">
                        {notice.body}
                      </span>
                    ) : null}
                    <span className="staff-notice-card__meta">
                      {formatNotificationAge(notice.createdAt)}
                      {stay ? ` · ${stay}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="staff-desk__empty-state">
            <h2>{t("transfers.empty")}</h2>
            <p>{t("transfers.emptyHint")}</p>
          </div>
        )}
      </div>

      <StaffDialog
        closeLabel={t("common.close")}
        onClose={closeNotice}
        open={Boolean(selected)}
        title={selected?.title ?? t("transfers.title")}
        footer={
          selected?.href ? (
            <Link
              className="button button--primary"
              href={selected.href}
              prefetch={false}
            >
              {t("transfers.openItem")}
            </Link>
          ) : null
        }
      >
        {selected ? (
          <dl className="staff-desk__detail-list">
            <div>
              <dt>{t("common.type")}</dt>
              <dd>{notificationKindLabel(selected.kind)}</dd>
            </div>
            <div>
              <dt>{t("common.date")}</dt>
              <dd>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(selected.createdAt))}
              </dd>
            </div>
            <div>
              <dt>{t("reservations.stay")}</dt>
              <dd>
                {formatStay(selected.stayArrival, selected.stayDeparture) ||
                  "—"}
              </dd>
            </div>
            <div>
              <dt>{t("common.note")}</dt>
              <dd>{selected.body || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </StaffDialog>
    </div>
  );
}
