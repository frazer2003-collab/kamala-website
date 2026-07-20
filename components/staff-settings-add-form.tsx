"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState } from "react";
import {
  addStaffNotificationEmail,
  type StaffSettingsState,
} from "@/app/staff/auth-actions";

const initialState: StaffSettingsState = {};

type StaffSettingsAddFormProps = {
  disabled?: boolean;
};

export function StaffSettingsAddForm({ disabled = false }: StaffSettingsAddFormProps) {
  const [state, formAction] = useActionState(addStaffNotificationEmail, initialState);

  return (
    <form action={formAction} className="booking-form staff-settings-form">
      <StaffFormBusyBridge />
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

      <div className="field-pair">
        <label htmlFor="staff-email">Email address</label>
        <input
          disabled={disabled}
          id="staff-email"
          name="email"
          placeholder="staff@example.com"
          required
          type="email"
        />
      </div>

      <div className="field-pair">
        <label htmlFor="staff-email-label">
          Label <span className="field-required">Optional</span>
        </label>
        <input
          disabled={disabled}
          id="staff-email-label"
          name="label"
          placeholder="Front desk"
          type="text"
        />
      </div>

      <fieldset className="staff-settings-access" disabled={disabled}>
        <legend>Calendar access</legend>
        <label className="staff-settings-access__option">
          <input defaultChecked name="calendar-access" type="radio" value="read_write" />
          <span>
            <strong>Read &amp; write</strong>
            <span>
              Booking alerts, full calendar access (walk-ins, allotment, closures).
            </span>
          </span>
        </label>
        <label className="staff-settings-access__option">
          <input name="calendar-access" type="radio" value="read" />
          <span>
            <strong>Read only</strong>
            <span>View the calendar only — no booking alerts, no edits.</span>
          </span>
        </label>
      </fieldset>

      <p className="field-help">
        Sign in with this email plus the shared staff password. Only read &amp; write
        staff get booking notification emails.
      </p>

      <button className="button button--primary" disabled={disabled} type="submit">
        Add email
      </button>
    </form>
  );
}
