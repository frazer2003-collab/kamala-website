"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/staff/notification-actions";
import { StaffCancelHoldPanel } from "@/components/staff-cancel-hold-panel";
import { StaffDialog } from "@/components/staff-dialog";
import { useStaffLocale } from "@/components/staff-locale";
import { StaffRequestDecisionPanel } from "@/components/staff-request-decision-panel";
import {
  getStaffBookingKey,
  isUnverifiedBankHold,
  type StaffBooking,
} from "@/lib/booking-requests";
import type { PropertyCurrency } from "@/lib/currency";
import {
  buildNotificationDigest,
  formatStayRangeLabel,
  type NotificationDigestItem,
  type NotificationFocus,
} from "@/lib/staff-notification-digest";
import {
  formatNotificationAge,
  notificationKindLabel,
  type StaffDeskNotification,
} from "@/lib/staff-desk-notifications";

function focusHref(focus: NotificationFocus) {
  if (focus === "all") return "/staff/transfers";
  return `/staff/transfers?focus=${focus}`;
}

function NoticeCard({
  item,
  locale,
  onOpen,
}: {
  item: NotificationDigestItem;
  locale: string;
  onOpen: (id: string) => void;
}) {
  const stay = formatStayRangeLabel(item.stayArrival, item.stayDeparture, locale);
  return (
    <li>
      <button
        className={[
          "staff-notice-card",
          item.section === "action" ? "staff-notice-card--action" : "",
          item.urgent ? "staff-notice-card--urgent" : "",
          !item.readAt && item.section === "activity"
            ? "staff-notice-card--unread"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onOpen(item.id)}
        type="button"
      >
        <span className="staff-notice-card__top">
          <span className="staff-notice-card__kind">
            {notificationKindLabel(item.kind)}
          </span>
          {item.ctaLabel ? (
            <span className="staff-notice-card__cta">{item.ctaLabel}</span>
          ) : null}
        </span>
        <strong className="staff-notice-card__title">{item.guestLabel}</strong>
        <span className="staff-notice-card__body">
          {item.body || notificationKindLabel(item.kind)}
        </span>
        <span className="staff-notice-card__meta">
          {formatNotificationAge(item.createdAt)}
          {stay ? ` · ${stay}` : ""}
        </span>
      </button>
    </li>
  );
}

export function StaffNotificationsFeed({
  notifications,
  openBookings,
  focus = "all",
  initialOpenId = null,
  canManage = false,
  currency = "thb",
}: {
  notifications: StaffDeskNotification[];
  openBookings: StaffBooking[];
  focus?: NotificationFocus;
  initialOpenId?: string | null;
  canManage?: boolean;
  currency?: PropertyCurrency;
}) {
  const { t, locale } = useStaffLocale();
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [items, setItems] = useState(notifications);
  const [pending, startTransition] = useTransition();

  const digest = useMemo(
    () =>
      buildNotificationDigest({
        notifications: items,
        openBookings,
        focus,
      }),
    [items, openBookings, focus],
  );

  const selected = useMemo(() => {
    const pool = [...digest.actionItems, ...digest.activityItems];
    return pool.find((row) => row.id === openId) ?? null;
  }, [digest, openId]);

  const selectedBooking = useMemo(() => {
    if (!selected?.bookingId) return null;
    return (
      openBookings.find((booking) => {
        const id = booking.databaseId || getStaffBookingKey(booking);
        return id === selected.bookingId;
      }) ?? null
    );
  }, [openBookings, selected]);

  const bankPending =
    selected?.kind === "transfer_verify" &&
    selectedBooking &&
    isUnverifiedBankHold(selectedBooking);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  useEffect(() => {
    setOpenId(initialOpenId);
  }, [initialOpenId]);

  function softUrl(next: string) {
    window.history.replaceState(null, "", next);
  }

  function openNotice(id: string) {
    setOpenId(id);
    const params = new URLSearchParams();
    if (focus !== "all") params.set("focus", focus);
    params.set("open", id);
    softUrl(`/staff/transfers?${params.toString()}`);

    if (!id.startsWith("live:")) {
      setItems((current) =>
        current.map((row) =>
          row.id === id && !row.readAt
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
      startTransition(async () => {
        try {
          await markNotificationRead(id);
        } catch {
          /* non-blocking */
        }
      });
    }
  }

  function closeNotice() {
    setOpenId(null);
    softUrl(focusHref(focus));
  }

  function markAllRead() {
    startTransition(async () => {
      setItems((current) =>
        current.map((row) =>
          row.readAt ? row : { ...row, readAt: new Date().toISOString() },
        ),
      );
      try {
        await markAllNotificationsRead();
      } catch {
        /* non-blocking */
      }
    });
  }

  const focusTabs: { id: NotificationFocus; label: string; count: number }[] = [
    {
      id: "all",
      label: t("transfers.filterAll"),
      count: digest.summary.actionCount + digest.activityItems.length,
    },
    {
      id: "action",
      label: t("transfers.focusAction"),
      count: digest.summary.actionCount,
    },
    {
      id: "bookings",
      label: t("transfers.focusBookings"),
      count: digest.summary.bookingEventCount,
    },
    {
      id: "messages",
      label: t("transfers.focusMessages"),
      count: digest.summary.replyCount,
    },
  ];

  return (
    <div className="staff-desk__list-shell">
      <div className="staff-notice-summary" aria-label={t("transfers.summary")}>
        <span>
          <strong>{digest.summary.actionCount}</strong> {t("transfers.needsYou")}
        </span>
        <span>
          <strong>{digest.summary.replyCount}</strong> {t("transfers.focusMessages")}
        </span>
        <span>
          <strong>{digest.summary.moneyCount}</strong> {t("transfers.moneyDue")}
        </span>
        <span>
          <strong>{digest.summary.unreadCount}</strong> {t("transfers.unread")}
        </span>
        {digest.summary.unreadCount > 0 ? (
          <button
            className="button button--quiet button--compact"
            disabled={pending}
            onClick={markAllRead}
            type="button"
          >
            {t("transfers.markAllRead")}
          </button>
        ) : null}
      </div>

      <div
        className="staff-desk__filter-row"
        aria-label={t("transfers.focusFilter")}
        role="group"
      >
        {focusTabs.map((tab) => (
          <Link
            aria-current={focus === tab.id ? "true" : undefined}
            className={[
              "staff-desk__chip",
              focus === tab.id ? "staff-desk__chip--active" : "",
              tab.id === "action" && tab.count > 0 ? "staff-desk__chip--urgent" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={focusHref(tab.id)}
            key={tab.id}
            prefetch={false}
          >
            {tab.label} · {tab.count}
          </Link>
        ))}
      </div>

      <div className="staff-desk__panel staff-desk__panel--fill">
        {digest.actionItems.length === 0 && digest.activityItems.length === 0 ? (
          <div className="staff-desk__empty-state">
            <h2>{t("transfers.empty")}</h2>
            <p>{t("transfers.emptyHint")}</p>
          </div>
        ) : (
          <div className="staff-notice-sections">
            {digest.actionItems.length ? (
              <section aria-labelledby="notice-needs-you">
                <h2 className="staff-notice-section-title" id="notice-needs-you">
                  {t("transfers.needsYou")}
                </h2>
                <ul className="staff-notice-feed">
                  {digest.actionItems.map((item) => (
                    <NoticeCard
                      item={item}
                      key={item.id}
                      locale={locale}
                      onOpen={openNotice}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {digest.activityItems.length ? (
              <section aria-labelledby="notice-activity">
                <h2 className="staff-notice-section-title" id="notice-activity">
                  {t("transfers.recentActivity")}
                </h2>
                <ul className="staff-notice-feed">
                  {digest.activityItems.map((item) => (
                    <NoticeCard
                      item={item}
                      key={item.id}
                      locale={locale}
                      onOpen={openNotice}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <StaffDialog
        closeLabel={t("common.close")}
        onClose={closeNotice}
        open={Boolean(selected)}
        title={selected?.guestLabel ?? t("transfers.title")}
        footer={
          bankPending ? null : selected?.href ? (
            <Link
              className="button button--primary"
              href={selected.href}
              prefetch={false}
            >
              {selected.ctaLabel || t("transfers.openItem")}
            </Link>
          ) : null
        }
      >
        {selected ? (
          <>
            <dl className="staff-desk__detail-list">
              <div>
                <dt>{t("common.type")}</dt>
                <dd>{notificationKindLabel(selected.kind)}</dd>
              </div>
              <div>
                <dt>{t("common.date")}</dt>
                <dd>
                  {new Intl.DateTimeFormat(locale === "th" ? "th" : "en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(selected.createdAt))}
                </dd>
              </div>
              <div>
                <dt>{t("reservations.stay")}</dt>
                <dd>
                  {formatStayRangeLabel(
                    selected.stayArrival,
                    selected.stayDeparture,
                    locale,
                  ) || "—"}
                </dd>
              </div>
              <div>
                <dt>{t("common.note")}</dt>
                <dd>{selected.body || "—"}</dd>
              </div>
            </dl>
            {bankPending && selectedBooking?.databaseId ? (
              <div className="staff-notice-decide">
                <StaffCancelHoldPanel
                  bookingId={selectedBooking.databaseId}
                  canManage={canManage && Boolean(selectedBooking.databaseId)}
                  guestName={selectedBooking.guest}
                  holdKind="bank-transfer-hold"
                />
                <StaffRequestDecisionPanel
                  alreadyConfirmed={false}
                  bankTransferClaimed={selectedBooking.bankTransferClaimed}
                  bookingId={selectedBooking.databaseId}
                  canManage={canManage && Boolean(selectedBooking.databaseId)}
                  currency={currency}
                  depositAmount={selectedBooking.depositAmount}
                  depositPaid={selectedBooking.depositPaid}
                  guestEmail={selectedBooking.contact}
                  guestName={selectedBooking.guest}
                  needsReply={selectedBooking.status === "needs-reply"}
                  paidByCard={Boolean(selectedBooking.stripePaymentIntentId)}
                  unclaimedCheckout={false}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </StaffDialog>
    </div>
  );
}
