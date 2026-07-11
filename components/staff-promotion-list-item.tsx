"use client";

import { useState } from "react";
import Link from "next/link";
import { removeRoomPromotion } from "@/app/staff/auth-actions";
import type { StaffRoomPromotion } from "@/lib/room-promotions";

type StaffPromotionListItemProps = {
  promotion: StaffRoomPromotion;
  roomName: string;
  dateLabel: string;
  timing: "live" | "upcoming" | "ended";
  editing: boolean;
};

export function StaffPromotionListItem({
  promotion,
  roomName,
  dateLabel,
  timing,
  editing,
}: StaffPromotionListItemProps) {
  const [confirming, setConfirming] = useState(false);

  const timingLabel =
    timing === "live" ? "Live now" : timing === "upcoming" ? "Upcoming" : "Ended";

  return (
    <li className={`staff-promotions-list__item${editing ? " staff-promotions-list__item--editing" : ""}`}>
      <div className="staff-promotions-list__main">
        <div className="staff-promotions-list__title-row">
          <strong>{roomName}</strong>
          <span className={`staff-promotions-list__timing staff-promotions-list__timing--${timing}`}>
            {timingLabel}
          </span>
        </div>
        <span className="staff-promotions-list__meta">
          <span className="staff-promotions-list__rate">{promotion.percentOff}% off</span>
          <span className="staff-promotions-list__dates">{dateLabel}</span>
        </span>
        {promotion.label ? (
          <span className="staff-promotions-list__label">{promotion.label}</span>
        ) : null}
      </div>

      <div className="staff-promotions-list__actions">
        {timing !== "ended" ? (
          <Link
            className="button button--quiet"
            href={editing ? "/staff/promotions" : `/staff/promotions?edit=${promotion.id}`}
          >
            {editing ? "Cancel" : "Edit"}
          </Link>
        ) : null}

        {confirming ? (
          <form action={removeRoomPromotion} className="staff-promotions-list__confirm">
            <input name="promotion-id" type="hidden" value={promotion.id} />
            <p className="staff-promotions-list__confirm-copy">
              Remove {promotion.percentOff}% off {roomName} ({dateLabel})? Guests will see the
              standard rate again.
            </p>
            <div className="staff-promotions-list__confirm-actions">
              <button className="button button--primary" type="submit">
                Remove discount
              </button>
              <button
                className="button button--quiet"
                onClick={() => setConfirming(false)}
                type="button"
              >
                Keep it
              </button>
            </div>
          </form>
        ) : (
          <button
            className="button button--quiet"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
