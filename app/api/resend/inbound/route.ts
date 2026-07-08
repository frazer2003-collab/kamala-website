import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  fetchInboundEmailContent,
  getBookingByRef,
  importInboundEmailReply,
  parseBookingRefFromSubject,
  parseEmailAddress,
} from "@/lib/booking-chat";

export const runtime = "nodejs";

type ResendInboundEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

function verifySvixSignature(
  payload: string,
  headers: Headers,
  secret: string,
) {
  const messageId = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");

  if (!messageId || !timestamp || !signatureHeader) {
    return false;
  }

  const signedContent = `${messageId}.${timestamp}.${payload}`;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");

  for (const part of signatureHeader.split(" ")) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) {
      continue;
    }

    const expected = createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const actual = Buffer.from(signature, "base64");
    const expectedBuffer = Buffer.from(expected, "base64");

    if (
      actual.length === expectedBuffer.length &&
      timingSafeEqual(actual, expectedBuffer)
    ) {
      return true;
    }
  }

  return false;
}

function parseBookingRefFromAddress(addresses: string[] | undefined) {
  if (!addresses?.length) {
    return null;
  }

  for (const address of addresses) {
    const match = address.match(/booking\+([a-f0-9]{8})@/i);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const body = await request.text();

  if (webhookSecret) {
    const valid = verifySvixSignature(body, request.headers, webhookSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: ResendInboundEvent;

  try {
    event = JSON.parse(body) as ResendInboundEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type !== "email.received" || !event.data?.email_id) {
    return NextResponse.json({ received: true });
  }

  const emailId = event.data.email_id;
  const from = event.data.from ?? "";
  const subject = event.data.subject ?? "";
  const addressRef = parseBookingRefFromAddress(event.data.to);
  const subjectRef = parseBookingRefFromSubject(subject);
  const bookingRef = addressRef ?? subjectRef;

  const content = await fetchInboundEmailContent(emailId);
  const text = content?.text ?? "";

  if (!text.trim()) {
    return NextResponse.json({ received: true, skipped: "empty-body" });
  }

  if (bookingRef) {
    const booking = await getBookingByRef(bookingRef);
    if (booking && booking.guest_email.toLowerCase() === parseEmailAddress(from)) {
      const result = await importInboundEmailReply({
        from,
        subject,
        text,
        emailId,
      });

      return NextResponse.json({ received: true, result });
    }
  }

  const result = await importInboundEmailReply({
    from,
    subject,
    text,
    emailId,
  });

  return NextResponse.json({ received: true, result });
}
