"use client";

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

      <button className="button button--primary" disabled={disabled} type="submit">
        Add email
      </button>
    </form>
  );
}
