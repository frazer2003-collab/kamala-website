import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guestCanAccessChat,
  guestHasConversationLink,
  isChatReadOnly,
  WALK_IN_GUEST_EMAIL,
} from "./booking-chat";

describe("guest chat access", () => {
  it("allows conversation links before payment so staff emails are not dead ends", () => {
    assert.equal(guestCanAccessChat("new"), true);
    assert.equal(guestCanAccessChat("pending_payment"), true);
    assert.equal(guestCanAccessChat("awaiting"), true);
    assert.equal(guestCanAccessChat("confirmed"), true);
    assert.equal(guestCanAccessChat("needs-reply"), true);
  });

  it("keeps declined threads readable but closed for compose", () => {
    assert.equal(guestCanAccessChat("declined"), true);
    assert.equal(isChatReadOnly("declined"), true);
    assert.equal(isChatReadOnly("awaiting"), false);
  });

  it("does not give walk-in placeholder guests a conversation link", () => {
    assert.equal(guestHasConversationLink(WALK_IN_GUEST_EMAIL), false);
    assert.equal(guestHasConversationLink(" Walk-In@kamala.local "), false);
    assert.equal(guestHasConversationLink("guest@example.com"), true);
  });
});
