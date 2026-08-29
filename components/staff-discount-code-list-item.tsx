"use client";

import { useState } from "react";
import { deactivateDiscountCode } from "@/app/staff/auth-actions";
import type { DiscountCode } from "@/lib/discount-codes";

type StaffDiscountCodeListItemProps = {
  code: DiscountCode;
  roomName: string;
  timing: "live" | "expired" | "exhausted" | "disabled";
  usesLabel: string;
  validUntilLabel: string;
};

const timingLabels = {
  live: "Live",
  expired: "Expired",
  exhausted: "Exhausted",
  disabled: "Disabled",
} as const;

export function StaffDiscountCodeListItem({
  code,
  roomName,
  timing,
  usesLabel,
  validUntilLabel,
}: StaffDiscountCodeListItemProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="staff-promotions-list__item">
      <div className="staff-promotions-list__main">
        <div className="staff-promotions-list__title-row">
          <strong>{code.code}</strong>
          <span className={`staff-promotions-list__timing staff-promotions-list__timing--${timing === "live" ? "live" : "ended"}`}>
            {timingLabels[timing]}
          </span>
        </div>
        <span className="staff-promotions-list__meta">
          <span className="staff-promotions-list__rate">{code.percentOff}% off</span>
          <span className="staff-promotions-list__dates">{roomName}</span>
          <span className="staff-promotions-list__dates">{usesLabel}</span>
          <span className="staff-promotions-list__dates">{validUntilLabel}</span>
        </span>
        {code.label ? (
          <span className="staff-promotions-list__label">{code.label}</span>
        ) : null}
      </div>

      <div className="staff-promotions-list__actions">
        {code.active && timing === "live" ? (
          confirming ? (
            <form action={deactivateDiscountCode} className="staff-promotions-list__confirm">
              <input name="code-id" type="hidden" value={code.id} />
              <p className="staff-promotions-list__confirm-copy">
                Disable <strong>{code.code}</strong>? Guests won&apos;t be able to use it after this.
              </p>
              <div className="staff-promotions-list__confirm-actions">
                <button className="button button--danger" type="submit">
                  Disable code
                </button>
                <button
                  className="button button--quiet"
                  onClick={() => setConfirming(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="button button--quiet"
              onClick={() => setConfirming(true)}
              type="button"
            >
              Disable
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}
