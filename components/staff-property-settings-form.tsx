"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState } from "react";
import { updatePropertySettings, type StaffSettingsState } from "@/app/staff/auth-actions";
import type { PropertySettings } from "@/lib/property-settings";

const initialState: StaffSettingsState = {};

export function StaffPropertySettingsForm({
  settings,
  disabled,
}: {
  settings: PropertySettings;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePropertySettings, initialState);

  return (
    <form action={formAction} className="staff-settings-form">
      <StaffFormBusyBridge />
      <div className="field-pair">
        <label htmlFor="property-name">Property name</label>
        <input
          defaultValue={settings.propertyName}
          disabled={disabled}
          id="property-name"
          name="property-name"
          required
          type="text"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="property-tagline">Tagline</label>
        <input
          defaultValue={settings.propertyTagline}
          disabled={disabled}
          id="property-tagline"
          name="property-tagline"
          type="text"
        />
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="address-line">Address</label>
        <input
          defaultValue={settings.addressLine ?? ""}
          disabled={disabled}
          id="address-line"
          name="address-line"
          type="text"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="contact-email">Contact email</label>
        <input
          defaultValue={settings.contactEmail ?? ""}
          disabled={disabled}
          id="contact-email"
          name="contact-email"
          type="email"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="contact-phone">Contact phone</label>
        <input
          defaultValue={settings.contactPhone ?? ""}
          disabled={disabled}
          id="contact-phone"
          name="contact-phone"
          type="tel"
        />
      </div>
      <div className="field-pair field-pair--wide staff-settings-calendar-colors">
        <h3 className="staff-settings-subheading">Bank transfer / PromptPay</h3>
        <p className="staff-settings-calendar-colors__hint">
          Guests see these when paying by bank transfer. Card payments still use Stripe (+3% bank
          charge).
        </p>
        <div className="staff-settings-calendar-colors__grid">
          <div className="field-pair">
            <label htmlFor="promptpay-id">PromptPay ID</label>
            <input
              aria-describedby="promptpay-id-hint"
              defaultValue={settings.promptPayId ?? ""}
              disabled={disabled}
              id="promptpay-id"
              name="promptpay-id"
              type="text"
            />
            <span className="staff-settings-calendar-colors__hint" id="promptpay-id-hint">
              Phone, National ID, or tax ID
            </span>
          </div>
          <div className="field-pair">
            <label htmlFor="bank-name">Bank name</label>
            <input
              defaultValue={settings.bankName ?? ""}
              disabled={disabled}
              id="bank-name"
              name="bank-name"
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="account-name">Account name</label>
            <input
              defaultValue={settings.accountName ?? ""}
              disabled={disabled}
              id="account-name"
              name="account-name"
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="account-number">Account number</label>
            <input
              defaultValue={settings.accountNumber ?? ""}
              disabled={disabled}
              id="account-number"
              inputMode="numeric"
              name="account-number"
              type="text"
            />
          </div>
        </div>
      </div>
      <div className="field-pair">
        <label htmlFor="check-in-from">Check-in from</label>
        <input
          defaultValue={settings.checkInFrom}
          disabled={disabled}
          id="check-in-from"
          name="check-in-from"
          type="text"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="check-in-until">Check-in until</label>
        <input
          defaultValue={settings.checkInUntil}
          disabled={disabled}
          id="check-in-until"
          name="check-in-until"
          type="text"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="quiet-hours">Quiet hours</label>
        <input
          defaultValue={settings.quietHours}
          disabled={disabled}
          id="quiet-hours"
          name="quiet-hours"
          type="text"
        />
      </div>
      <div className="field-pair">
        <label htmlFor="currency">Currency</label>
        <select defaultValue={settings.currency} disabled={disabled} id="currency" name="currency">
          <option value="thb">THB (฿)</option>
          <option value="usd">USD ($)</option>
        </select>
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="line-url">LINE link (optional)</label>
        <input
          defaultValue={settings.lineUrl ?? ""}
          disabled={disabled}
          id="line-url"
          name="line-url"
          placeholder="https://line.me/..."
          type="url"
        />
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="whatsapp-url">WhatsApp link (optional)</label>
        <input
          defaultValue={settings.whatsappUrl ?? ""}
          disabled={disabled}
          id="whatsapp-url"
          name="whatsapp-url"
          placeholder="https://wa.me/..."
          type="url"
        />
      </div>
      <div className="field-pair field-pair--wide staff-settings-calendar-colors">
        <h3 className="staff-settings-subheading">Staff calendar colors</h3>
        <p className="staff-settings-calendar-colors__hint">
          Available, closed, sold out, and reservation colors on the staff calendar.
        </p>
        <div className="staff-settings-calendar-colors__grid">
          <div className="field-pair">
            <label htmlFor="calendar-color-available">Available dates</label>
            <input
              defaultValue={settings.calendarColors.available}
              disabled={disabled}
              id="calendar-color-available"
              name="calendar-color-available"
              type="color"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="calendar-color-closed">Closed dates</label>
            <input
              defaultValue={settings.calendarColors.closed}
              disabled={disabled}
              id="calendar-color-closed"
              name="calendar-color-closed"
              type="color"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="calendar-color-sold-out">Sold out</label>
            <input
              defaultValue={settings.calendarColors.soldOut}
              disabled={disabled}
              id="calendar-color-sold-out"
              name="calendar-color-sold-out"
              type="color"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="calendar-color-booking">Reservations</label>
            <input
              defaultValue={settings.calendarColors.booking}
              disabled={disabled}
              id="calendar-color-booking"
              name="calendar-color-booking"
              type="color"
            />
          </div>
        </div>
        <div className="calendar-color-legend" aria-hidden="true">
          <span
            className="calendar-color-legend__swatch calendar-color-legend__swatch--available"
            style={{ background: settings.calendarColors.available }}
          />
          Available
          <span
            className="calendar-color-legend__swatch calendar-color-legend__swatch--closed"
            style={{ background: settings.calendarColors.closed }}
          />
          Closed
          <span
            className="calendar-color-legend__swatch"
            style={{ background: settings.calendarColors.soldOut }}
          />
          Sold out
          <span
            className="calendar-color-legend__swatch calendar-color-legend__swatch--booking"
            style={{ background: settings.calendarColors.booking }}
          />
          Reservations
        </div>
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="house-rules">House rules (one per line)</label>
        <textarea
          defaultValue={settings.houseRules.join("\n")}
          disabled={disabled}
          id="house-rules"
          name="house-rules"
          rows={5}
        />
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="cancellation-policy">Cancellation policy</label>
        <textarea
          defaultValue={settings.cancellationPolicy}
          disabled={disabled}
          id="cancellation-policy"
          name="cancellation-policy"
          rows={4}
        />
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="privacy-policy">Privacy policy</label>
        <textarea
          defaultValue={settings.privacyPolicy}
          disabled={disabled}
          id="privacy-policy"
          name="privacy-policy"
          rows={4}
        />
      </div>
      <div className="field-pair field-pair--wide">
        <label htmlFor="terms-summary">Booking terms summary</label>
        <textarea
          defaultValue={settings.termsSummary}
          disabled={disabled}
          id="terms-summary"
          name="terms-summary"
          rows={4}
        />
      </div>
      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="form-message form-message--success" role="status">
          {state.success}
        </p>
      ) : null}
      <button className="button button--primary" disabled={disabled || pending} type="submit">
        {pending ? "Saving..." : "Save property settings"}
      </button>
    </form>
  );
}
