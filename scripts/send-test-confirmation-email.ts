/**
 * Sends the real guest confirmation email template to one address, with
 * placeholder links. Needs RESEND_API_KEY and BOOKING_EMAIL_FROM in the env:
 *   vercel env run -e production -- npx tsx scripts/send-test-confirmation-email.ts you@example.com
 */
import { sendGuestChatNotificationEmail } from "@/lib/email";

const to = process.argv[2];
if (!to) {
  console.error("Usage: send-test-confirmation-email.ts <email>");
  process.exit(1);
}

const base = "https://www.kamalaguesthouse.com";
const token = "test-confirmation-preview";

void sendGuestChatNotificationEmail({
  to,
  guestName: "Frazer",
  roomName: "Superior Double or Twin Room",
  message:
    "TEST EMAIL — this is a preview of the booking confirmation email, not a real booking.\nThe Change your stay and Open conversation links use a test token, so they open the “link is not valid” page.",
  chatUrl: `${base}/booking/messages?token=${token}`,
  changeUrl: `${base}/booking/change?token=${token}`,
  kind: "confirmation",
}).then((result) => {
  console.log(result.ok ? `Sent test confirmation email to ${to}` : `Failed: ${result.reason}`);
  process.exit(result.ok ? 0 : 1);
});
