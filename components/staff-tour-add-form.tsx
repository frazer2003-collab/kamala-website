"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useActionState } from "react";
import { addTour, type StaffTourState } from "@/app/staff/auth-actions";
import { MAX_TOURS } from "@/lib/tour-catalog";

const initialState: StaffTourState = {};

export function StaffTourAddForm({
  disabled,
  tourCount,
}: {
  disabled: boolean;
  tourCount: number;
}) {
  const [state, formAction, pending] = useActionState(addTour, initialState);
  const atLimit = tourCount >= MAX_TOURS;

  return (
    <div className="staff-tour-add">
      <h2>Add tour</h2>
      {atLimit ? (
        <p className="staff-tour-add__limit">You can add up to {MAX_TOURS} tours.</p>
      ) : (
        <p className="staff-tour-add__hint">
          New tours appear on the public <a href="/tours">tours page</a>.
        </p>
      )}

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

      <form action={formAction} className="staff-tour-form staff-tour-form--add">
      <StaffFormBusyBridge />
        <div className="staff-tour-form__grid">
          <div className="field-pair field-pair--wide">
            <label htmlFor="new-tour-title">Tour title</label>
            <input
              disabled={disabled || atLimit}
              id="new-tour-title"
              name="title"
              placeholder="Sunset cruise"
              required
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="new-tour-duration">Duration</label>
            <input
              disabled={disabled || atLimit}
              id="new-tour-duration"
              name="duration-label"
              placeholder="2 hours"
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor="new-tour-price">Price label</label>
            <input
              disabled={disabled || atLimit}
              id="new-tour-price"
              name="price-label"
              placeholder="From ฿1,200"
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor="new-tour-summary">Summary</label>
            <textarea
              disabled={disabled || atLimit}
              id="new-tour-summary"
              name="summary"
              placeholder="A short description guests see on the card."
              required
              rows={3}
            />
          </div>
        </div>
        <button
          className="button button--primary"
          disabled={disabled || atLimit || pending}
          type="submit"
        >
          {pending ? "Adding..." : "Add tour"}
        </button>
      </form>
    </div>
  );
}
