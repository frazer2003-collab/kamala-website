/**
 * Sends one clearly-labelled test email through Resend, using the same REST
 * call lib/email.ts makes, so a pass here means the app's own path works.
 *
 *   $env:RESEND_API_KEY="re_..."
 *   $env:BOOKING_EMAIL_FROM="Kamala Guesthouse <bookings@kamalaguesthouse.com>"
 *   node scripts/send-test-email.mjs you@example.com
 *
 * Checks the key against /domains first, so an unverified sending domain is
 * reported as such instead of looking like a bad key.
 */

const API = "https://api.resend.com";

const recipient = process.argv[2]?.trim();
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.BOOKING_EMAIL_FROM;

function fail(message, hint) {
  console.error(`\n  FAILED  ${message}`);
  if (hint) {
    console.error(`          ${hint}`);
  }
  console.error("");
  process.exit(1);
}

if (!recipient || !recipient.includes("@")) {
  fail(
    "No recipient given.",
    "Usage: node scripts/send-test-email.mjs you@example.com",
  );
}

if (!apiKey) {
  fail(
    "RESEND_API_KEY is not set in this shell.",
    'PowerShell: $env:RESEND_API_KEY="re_..."',
  );
}

if (!from) {
  fail(
    "BOOKING_EMAIL_FROM is not set in this shell.",
    'PowerShell: $env:BOOKING_EMAIL_FROM="Kamala Guesthouse <bookings@your-domain.com>"',
  );
}

async function readBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const fromDomain = from.includes("@")
  ? from.split("@").pop().replace(">", "").trim().toLowerCase()
  : null;

console.log(`\n  Key      ${apiKey.slice(0, 3)}…${apiKey.slice(-4)} (${apiKey.length} chars)`);
console.log(`  From     ${from}`);
console.log(`  To       ${recipient}\n`);

const domainsResponse = await fetch(`${API}/domains`, {
  headers: { Authorization: `Bearer ${apiKey}` },
});

if (domainsResponse.status === 401 || domainsResponse.status === 403) {
  fail(
    `Resend rejected the key (HTTP ${domainsResponse.status}).`,
    "The key is invalid, revoked, or from a different account.",
  );
}

if (domainsResponse.ok) {
  const body = await readBody(domainsResponse);
  const domains = Array.isArray(body?.data) ? body.data : [];
  console.log("  Key accepted. Domains on this account:");
  if (domains.length === 0) {
    console.log("    (none — no domain is verified, so sending will fail)");
  }
  for (const domain of domains) {
    const mark = domain.status === "verified" ? "ok     " : "NOT OK ";
    console.log(`    ${mark} ${domain.name} — ${domain.status}`);
  }
  const match = domains.find((domain) => domain.name?.toLowerCase() === fromDomain);
  if (fromDomain && !match) {
    console.log(
      `\n  Note: ${fromDomain} is not on this account. Resend only sends from a verified domain.`,
    );
  } else if (match && match.status !== "verified") {
    console.log(`\n  Note: ${fromDomain} is ${match.status}, not verified.`);
  }
} else {
  console.log(
    `  Could not list domains (HTTP ${domainsResponse.status}); trying the send anyway.`,
  );
}

const sentAt = new Date().toISOString();
const subject = "Resend test — Kamala Guesthouse email is working";

const text = [
  "This is a test email.",
  "",
  "It was sent to confirm that Resend is configured correctly for Kamala",
  "Guesthouse. If you are reading this, the API key is valid, the sending",
  "domain is verified, and booking and chat emails can go out.",
  "",
  `Sent from: ${from}`,
  `Sent to:   ${recipient}`,
  `Sent at:   ${sentAt}`,
  "",
  "Nothing was booked and no guest was contacted. You can delete this.",
].join("\n");

const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2b1f22; line-height: 1.55; max-width: 560px;">
    <h1 style="font-size: 1.15rem; margin: 0 0 12px;">Resend is working</h1>
    <p style="margin: 0 0 14px;"><strong>This is a test email.</strong> It was sent to confirm that Resend is configured correctly for Kamala Guesthouse.</p>
    <p style="margin: 0 0 18px;">If you are reading this, the API key is valid, the sending domain is verified, and booking and chat emails can go out.</p>
    <table style="border-collapse: collapse; font-size: 0.9rem;">
      <tr><td style="padding: 4px 16px 4px 0; color: #7a6a6e;">Sent from</td><td>${from.replace(/</g, "&lt;")}</td></tr>
      <tr><td style="padding: 4px 16px 4px 0; color: #7a6a6e;">Sent to</td><td>${recipient}</td></tr>
      <tr><td style="padding: 4px 16px 4px 0; color: #7a6a6e;">Sent at</td><td>${sentAt}</td></tr>
    </table>
    <p style="margin: 18px 0 0; font-size: 0.85rem; color: #7a6a6e;">Nothing was booked and no guest was contacted. You can delete this.</p>
  </div>
`;

const sendResponse = await fetch(`${API}/emails`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to: [recipient], subject, text, html }),
});

const sendBody = await readBody(sendResponse);

if (!sendResponse.ok) {
  console.error(`\n  FAILED  Resend returned HTTP ${sendResponse.status}.`);
  console.error(`          ${JSON.stringify(sendBody)}\n`);
  process.exit(1);
}

console.log(`\n  SENT    id ${sendBody?.id ?? "(no id returned)"}`);
console.log("          Check the inbox, and Resend → Emails for delivery status.\n");
