"use client";

import { useActionState, useId } from "react";
import {
  initialContactFormState,
  sendContactMessage,
} from "@/app/contact-actions";
import { CONTACT_MESSAGE_MAX_LENGTH } from "@/lib/contact-message";

type ContactFormProps = {
  canEmail: boolean;
  propertyName: string;
};

export function ContactForm({ canEmail, propertyName }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialContactFormState(),
  );
  const formErrorId = useId();
  const nameErrorId = useId();
  const emailErrorId = useId();
  const phoneErrorId = useId();
  const messageErrorId = useId();

  if (!canEmail) {
    return (
      <div className="contact-form contact-form--unavailable">
        <p className="form-message form-message--setup" role="status">
          Email contact is not set up yet for {propertyName}. Use LINE, WhatsApp,
          or telephone if they appear beside this form.
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="contact-form contact-form--success" aria-live="polite">
        <p className="form-message form-message--success" role="status">
          {state.message}
        </p>
        <p className="contact-form__success-note">
          Prefer chat or a call? The channels beside this note stay available.
        </p>
        <a className="button button--secondary" href="/contact">
          Send another message
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="contact-form booking-form" noValidate>
      {state.status === "error" && state.message ? (
        <p className="form-message form-message--error" id={formErrorId} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="field-pair">
        <label htmlFor="contact-guest-name">
          Name <span className="field-required">Required</span>
        </label>
        <input
          aria-describedby={state.fieldErrors?.guestName ? nameErrorId : undefined}
          aria-invalid={state.fieldErrors?.guestName ? true : undefined}
          autoComplete="name"
          defaultValue={state.values.guestName}
          id="contact-guest-name"
          name="guest-name"
          required
          type="text"
        />
        {state.fieldErrors?.guestName ? (
          <p className="field-error" id={nameErrorId}>
            {state.fieldErrors.guestName}
          </p>
        ) : null}
      </div>

      <div className="field-pair">
        <label htmlFor="contact-guest-email">
          Email <span className="field-required">Required</span>
        </label>
        <input
          aria-describedby={state.fieldErrors?.guestEmail ? emailErrorId : undefined}
          aria-invalid={state.fieldErrors?.guestEmail ? true : undefined}
          autoComplete="email"
          defaultValue={state.values.guestEmail}
          id="contact-guest-email"
          inputMode="email"
          name="guest-email"
          required
          type="email"
        />
        {state.fieldErrors?.guestEmail ? (
          <p className="field-error" id={emailErrorId}>
            {state.fieldErrors.guestEmail}
          </p>
        ) : null}
      </div>

      <div className="field-pair field-pair--wide">
        <label htmlFor="contact-guest-phone">Phone (optional)</label>
        <input
          aria-describedby={state.fieldErrors?.guestPhone ? phoneErrorId : undefined}
          aria-invalid={state.fieldErrors?.guestPhone ? true : undefined}
          autoComplete="tel"
          defaultValue={state.values.guestPhone}
          id="contact-guest-phone"
          inputMode="tel"
          name="guest-phone"
          type="tel"
        />
        {state.fieldErrors?.guestPhone ? (
          <p className="field-error" id={phoneErrorId}>
            {state.fieldErrors.guestPhone}
          </p>
        ) : null}
      </div>

      <div className="field-pair field-pair--wide">
        <label htmlFor="contact-message">
          Message <span className="field-required">Required</span>
        </label>
        <textarea
          aria-describedby={state.fieldErrors?.message ? messageErrorId : undefined}
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          defaultValue={state.values.message}
          id="contact-message"
          maxLength={CONTACT_MESSAGE_MAX_LENGTH}
          name="message"
          required
          rows={6}
        />
        {state.fieldErrors?.message ? (
          <p className="field-error" id={messageErrorId}>
            {state.fieldErrors.message}
          </p>
        ) : null}
      </div>

      <button
        aria-describedby={state.status === "error" ? formErrorId : undefined}
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
