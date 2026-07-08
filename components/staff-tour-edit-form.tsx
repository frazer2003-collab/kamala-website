"use client";

import { useActionState } from "react";
import { removeTour, updateTour, type StaffTourState } from "@/app/staff/auth-actions";
import { StaffTourPhotoFields } from "@/components/staff-tour-photo-fields";
import type { StaffTour } from "@/lib/tours";

const initialState: StaffTourState = {};

export function StaffTourEditForm({
  tour,
  disabled,
}: {
  tour: StaffTour;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateTour, initialState);

  return (
    <article className="staff-tour-row">
      <form action={formAction} className="staff-tour-form">
        <input name="tour-id" type="hidden" value={tour.id} />
        <div className="staff-tour-form__header">
          <h2>{tour.title}</h2>
          {tour.durationLabel ? <span>{tour.durationLabel}</span> : null}
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

        <StaffTourPhotoFields disabled={disabled} tour={tour} />

        <div className="staff-tour-form__grid">
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${tour.id}-title`}>Tour title</label>
            <input
              defaultValue={tour.title}
              disabled={disabled}
              id={`${tour.id}-title`}
              name="title"
              required
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${tour.id}-duration`}>
              Duration <span className="field-required">Optional</span>
            </label>
            <input
              defaultValue={tour.durationLabel ?? ""}
              disabled={disabled}
              id={`${tour.id}-duration`}
              name="duration-label"
              placeholder="Full day"
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${tour.id}-price`}>
              Price label <span className="field-required">Optional</span>
            </label>
            <input
              defaultValue={tour.priceLabel ?? ""}
              disabled={disabled}
              id={`${tour.id}-price`}
              name="price-label"
              placeholder="From ฿1,200"
              type="text"
            />
          </div>
          <div className="field-pair field-pair--wide">
            <label htmlFor={`${tour.id}-summary`}>Summary</label>
            <textarea
              defaultValue={tour.summary}
              disabled={disabled}
              id={`${tour.id}-summary`}
              name="summary"
              required
              rows={3}
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${tour.id}-link-label`}>Button label</label>
            <input
              defaultValue={tour.linkLabel ?? "Enquire"}
              disabled={disabled}
              id={`${tour.id}-link-label`}
              name="link-label"
              placeholder="Enquire"
              type="text"
            />
          </div>
          <div className="field-pair">
            <label htmlFor={`${tour.id}-link-url`}>
              Button link <span className="field-required">Optional</span>
            </label>
            <input
              defaultValue={tour.linkUrl ?? ""}
              disabled={disabled}
              id={`${tour.id}-link-url`}
              name="link-url"
              placeholder="https://line.me/..."
              type="url"
            />
          </div>
        </div>

        <div className="staff-tour-form__actions">
          <button className="button button--primary" disabled={disabled || pending} type="submit">
            {pending ? "Saving..." : "Save tour"}
          </button>
          <button
            className="button button--quiet"
            disabled={disabled || pending}
            formAction={removeTour}
            type="submit"
          >
            Remove
          </button>
        </div>
      </form>
    </article>
  );
}
