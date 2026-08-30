"use client";

import { useActionState, useState } from "react";
import {
  updateStaffNotificationPassword,
  type StaffSettingsState,
} from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";

const initialState: StaffSettingsState = {};

type StaffEmailPasswordFormProps = {
  disabled?: boolean;
  email: string;
  emailId: string;
  hasPassword: boolean;
};

export function StaffEmailPasswordForm({
  disabled = false,
  email,
  emailId,
  hasPassword,
}: StaffEmailPasswordFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateStaffNotificationPassword, initialState);

  if (!open) {
    return (
      <button
        className="button button--quiet"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
      >
        {hasPassword ? "Change password" : "Set password"}
      </button>
    );
  }

  return (
    <form action={formAction} className="staff-email-password-form">
      <StaffFormBusyBridge />
      <input name="email-id" type="hidden" value={emailId} />
      <p className="staff-email-password-form__label">
        {hasPassword ? "New password for" : "Password for"} <strong>{email}</strong>
      </p>
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
        <label htmlFor={`staff-password-${emailId}`}>Password</label>
        <input
          autoComplete="new-password"
          disabled={disabled}
          id={`staff-password-${emailId}`}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="field-pair">
        <label htmlFor={`staff-password-confirm-${emailId}`}>Confirm password</label>
        <input
          autoComplete="new-password"
          disabled={disabled}
          id={`staff-password-confirm-${emailId}`}
          minLength={8}
          name="confirm-password"
          required
          type="password"
        />
      </div>
      <div className="staff-email-password-form__actions">
        <button className="button button--primary" disabled={disabled} type="submit">
          Save password
        </button>
        <button
          className="button button--quiet"
          disabled={disabled}
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
