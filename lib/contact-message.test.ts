import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  emptyContactMessageValues,
  validateContactMessage,
} from "@/lib/contact-message";

describe("validateContactMessage", () => {
  it("accepts a complete message with optional phone blank", () => {
    const errors = validateContactMessage({
      guestName: "Alex Guest",
      guestEmail: "alex@example.com",
      guestPhone: "",
      message: "Do you have a room next weekend?",
    });
    assert.deepEqual(errors, {});
  });

  it("requires name, email, and message", () => {
    const errors = validateContactMessage(emptyContactMessageValues());
    assert.equal(errors.guestName, "Enter your name.");
    assert.equal(errors.guestEmail, "Enter an email we can reply to.");
    assert.equal(errors.message, "Write a short message.");
  });

  it("rejects invalid email and short phone", () => {
    const errors = validateContactMessage({
      guestName: "Alex",
      guestEmail: "not-an-email",
      guestPhone: "123",
      message: "Hello",
    });
    assert.equal(errors.guestEmail, "Enter a valid email address.");
    assert.equal(errors.guestPhone, "Phone needs 7+ digits, or leave blank.");
  });

  it("rejects oversized messages", () => {
    const errors = validateContactMessage({
      guestName: "Alex",
      guestEmail: "alex@example.com",
      guestPhone: "",
      message: "x".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1),
    });
    assert.match(errors.message ?? "", /under/);
  });
});
