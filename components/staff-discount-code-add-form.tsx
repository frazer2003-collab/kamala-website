"use client";

import { useActionState, useId } from "react";
import { addDiscountCode, type StaffDiscountCodeState } from "@/app/staff/auth-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import type { Room } from "@/lib/content";
import { ALL_ROOMS_PROMOTION_ID } from "@/lib/room-promotion-constants";

const initialState: StaffDiscountCodeState = {};

type StaffDiscountCodeAddFormProps = {
  disabled?: boolean;
  rooms: Room[];
};

export function StaffDiscountCodeAddForm({
  disabled = false,
  rooms,
}: StaffDiscountCodeAddFormProps) {
  const [state, formAction, pending] = useActionState(addDiscountCode, initialState);
  const codeId = useId();

  return (
    <form action={formAction} className="staff-promotion-form">
      <StaffFormBusyBridge pending={pending} />

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
        <label htmlFor={`${codeId}-code`}>Code</label>
        <input
          autoComplete="off"
          disabled={disabled || pending}
          id={`${codeId}-code`}
          maxLength={20}
          name="code"
          placeholder="WELCOME10"
          required
          spellCheck={false}
          type="text"
        />
        <p className="field-hint">Letters and numbers only. Guests enter this at checkout.</p>
      </div>

      <div className="field-pair">
        <label htmlFor={`${codeId}-percent`}>Percent off</label>
        <input
          disabled={disabled || pending}
          id={`${codeId}-percent`}
          max={90}
          min={1}
          name="percent-off"
          required
          type="number"
        />
      </div>

      <div className="field-pair">
        <label htmlFor={`${codeId}-room`}>Room</label>
        <select
          defaultValue=""
          disabled={disabled || pending}
          id={`${codeId}-room`}
          name="room-id"
          required
        >
          <option disabled value="">
            Choose room scope
          </option>
          <option value={ALL_ROOMS_PROMOTION_ID}>All room types</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field-pair">
        <label htmlFor={`${codeId}-valid-until`}>Valid until (optional)</label>
        <input disabled={disabled || pending} id={`${codeId}-valid-until`} name="valid-until" type="date" />
        <p className="field-hint">Leave blank for no expiry date.</p>
      </div>

      <div className="field-pair">
        <label htmlFor={`${codeId}-max-uses`}>Max uses (optional)</label>
        <input
          disabled={disabled || pending}
          id={`${codeId}-max-uses`}
          min={1}
          name="max-uses"
          type="number"
        />
        <p className="field-hint">Leave blank for unlimited uses.</p>
      </div>

      <div className="field-pair">
        <label htmlFor={`${codeId}-label`}>Receipt label (optional)</label>
        <input
          disabled={disabled || pending}
          id={`${codeId}-label`}
          maxLength={48}
          name="label"
          placeholder="Welcome back"
          type="text"
        />
      </div>

      <button className="button button--primary" disabled={disabled || pending} type="submit">
        Create code
      </button>
    </form>
  );
}
