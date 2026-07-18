"use client";

import { useActionState } from "react";
import { loginStaff, type StaffLoginState } from "@/app/staff/auth-actions";

const initialState: StaffLoginState = {};

type StaffLoginFormProps = {
  nextPath: string;
  configured: boolean;
};

export function StaffLoginForm({ nextPath, configured }: StaffLoginFormProps) {
  const [state, formAction] = useActionState(loginStaff, initialState);

  return (
    <form action={formAction} className="booking-form staff-login-form">
      <input name="next" type="hidden" value={nextPath} />

      {!configured ? (
        <p className="form-message form-message--setup" role="status">
          Staff login is not configured yet. Add STAFF_ADMIN_PASSWORD and
          STAFF_SESSION_SECRET to your environment.
        </p>
      ) : null}

      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field-pair">
        <label htmlFor="staff-username">Username or staff email</label>
        <input
          autoComplete="username"
          disabled={!configured}
          id="staff-username"
          name="username"
          placeholder="admin or staff@example.com"
          required
          type="text"
        />
        <span className="field-help">
          Staff emails use the shared staff password. Calendar access is set under
          Settings.
        </span>
      </div>

      <div className="field-pair">
        <label htmlFor="staff-password">Password</label>
        <input
          autoComplete="current-password"
          disabled={!configured}
          id="staff-password"
          name="password"
          required
          type="password"
        />
      </div>

      <button
        className="button button--primary"
        disabled={!configured}
        type="submit"
      >
        Sign in
      </button>
    </form>
  );
}
