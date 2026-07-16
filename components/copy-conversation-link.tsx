"use client";

import { useState } from "react";

type CopyConversationLinkProps = {
  url: string;
};

export function CopyConversationLink({ url }: CopyConversationLinkProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="booking-chat-page__link-tools">
      <p>
        Save this private link — it is how you return to this conversation.
      </p>
      <div className="booking-chat-page__link-row">
        <code className="booking-chat-page__link">{url}</code>
        <button
          className="button button--secondary"
          onClick={() => void handleCopy()}
          type="button"
        >
          {status === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      {status === "failed" ? (
        <p className="form-message form-message--error" role="alert">
          Could not copy automatically — select the link and copy it manually.
        </p>
      ) : null}
    </div>
  );
}
