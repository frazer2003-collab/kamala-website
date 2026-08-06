"use client";

import { useActionState } from "react";
import {
  unlockStaffSensitive,
  type StaffPasscodeState,
} from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";

const initialState: StaffPasscodeState = {};

type StaffPasscodeFormProps = {
  nextPath: string;
};

export function StaffPasscodeForm({ nextPath }: StaffPasscodeFormProps) {
  const [state, formAction] = useActionState(unlockStaffSensitive, initialState);

  return (
    <form
      action={formAction}
      className="staff-login-form"
      data-busy-message="Checking passcode…"
    >
      <StaffFormBusyBridge message="Checking passcode…" />
      <input name="next" type="hidden" value={nextPath} />

      {state.error ? (
        <p className="form-message form-message--error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="field-pair">
        <label htmlFor="staff-passcode">Passcode</label>
        <input
          autoComplete="one-time-code"
          autoFocus
          id="staff-passcode"
          inputMode="numeric"
          name="passcode"
          pattern="[0-9]*"
          required
          type="password"
        />
      </div>

      <button className="button button--primary" type="submit">
        Continue
      </button>
    </form>
  );
}
