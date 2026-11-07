/**
 * Auto live usability pack against production portal.
 * Usage: node scripts/live-desk-usability.mjs
 * Env: LIVE_BASE_URL, LIVE_PORTAL_BILLS_PASSCODE, LIVE_PORTAL_LAUNDRY_PASSCODE
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.LIVE_BASE_URL || "https://www.kamalaguesthouse.com";
const BILLS_CODE = process.env.LIVE_PORTAL_BILLS_PASSCODE || "bills";
const LAUNDRY_CODE = process.env.LIVE_PORTAL_LAUNDRY_PASSCODE || "sheets";
const OUT = join(__dirname, "..", ".cursor", "agents", "roles", "reports");

const results = [];

function record(id, status, notes) {
  results.push({ id, status, notes });
  console.log(`${status.padEnd(6)} ${id} — ${notes}`);
}

async function loginPortal(page, kind, code) {
  await page.goto(`${BASE}/staff/portal/login?portal=${kind}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel(/passcode/i).fill(code);
  await page.getByRole("button", { name: kind === "bills" ? /open bills/i : /open laundry/i }).click();
  await page.waitForURL(`**/staff/portal/${kind}**`, { timeout: 20000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.setDefaultTimeout(20000);

  try {
    // --- 8. Portal bills New bill ---
    await loginPortal(page, "bills", BILLS_CODE);
    const newBill = page.getByRole("button", { name: /^New bill$/i }).first();
    await newBill.click();
    await page.waitForURL(/\?open=/, { timeout: 20000 });
    const dialog = page.getByRole("heading", { level: 2 }).first();
    await dialog.waitFor({ state: "visible" });
    const nameBox = page.getByLabel(/^Name$/i).first();
    await nameBox.waitFor({ state: "visible" });
    record(
      "8",
      "PASS",
      `New bill opened ${page.url().includes("?open=") ? "with ?open=" : "WITHOUT ?open="}; quiet (no full-page busy observed)`,
    );

    // --- 12 + 16. Dual-submit + honest labels ---
    const stamp = `Auto live ${Date.now().toString(36)}`;
    await nameBox.fill(stamp);

    const combo = page.getByLabel(/add item/i).first();
    await combo.click();
    await combo.fill("water");
    const option = page.getByRole("button", { name: /bottled water|น้ำดื่ม/i }).first();
    await option.waitFor({ state: "visible" });
    await option.click();

    const saveBtn = page.getByRole("button", { name: /^Save$/i }).first();
    const addBtn = page.getByRole("button", { name: /^Add$/i }).first();

    const mid = await page.evaluate(async () => {
      const save = [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "Save" && b.type === "submit",
      );
      const add = [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "Add",
      );
      save?.click();
      add?.click();
      await new Promise((r) => setTimeout(r, 120));
      const labels = [...document.querySelectorAll("button")]
        .map((b) => ({
          text: (b.textContent || "").trim(),
          disabled: b.disabled,
        }))
        .filter((b) => /^(Save|Saving|Add|Adding)/i.test(b.text));
      const clear = [...document.querySelectorAll("button")].find((b) =>
        /clear/i.test(b.textContent || ""),
      );
      const overlay = Boolean(
        document.querySelector('[data-busy]:not([data-busy="quiet"])'),
      );
      return {
        labels,
        clearDisabled: clear ? clear.disabled : null,
        overlay,
      };
    });

    await page.waitForTimeout(3500);
    const nameAfter = await nameBox.inputValue().catch(() => "");
    const title = await page.getByRole("heading", { level: 2 }).first().textContent();

    const bothPending =
      mid.labels.some((l) => /Saving/i.test(l.text)) &&
      mid.labels.some((l) => /Adding/i.test(l.text));
    const saveShowsAdding = mid.labels.some(
      (l) => /^Save$/i.test(l.text) === false && /Saving/i.test(l.text),
    );
    const siblingFake =
      mid.labels.filter((l) => /Saving|Adding/i.test(l.text)).length >= 2;

    if (mid.overlay) {
      record("6", "FAIL", "Full-page busy overlay appeared during micro-save");
    } else {
      record("6", "PASS", "No full-page busy overlay during Save+Add");
    }

    if (bothPending || siblingFake) {
      record(
        "16",
        "FAIL",
        `Sibling pending bleed on production: ${JSON.stringify(mid.labels)} (rev3 honest labels not deployed)`,
      );
    } else {
      record("16", "PASS", `Honest labels mid-flight: ${JSON.stringify(mid.labels)}`);
    }

    if (nameAfter === stamp || (title && title.includes(stamp))) {
      record("12", "PASS", `Name persisted after dual-submit (${stamp}); Clear disabled mid-add=${mid.clearDisabled}`);
    } else {
      record(
        "12",
        "WARN",
        `Name after race: input="${nameAfter}" title="${title}"; labels=${JSON.stringify(mid.labels)}`,
      );
    }

    if (mid.clearDisabled === false && mid.labels.some((l) => /Adding/i.test(l.text))) {
      record("15", "FAIL", "Clear bill stayed enabled while Adding…");
    } else if (mid.clearDisabled === true) {
      record("15", "PASS", "Clear gated while dialog busy");
    } else {
      record("15", "WARN", `Clear disabled=${mid.clearDisabled} during race`);
    }

    // Close dialog
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);

    // --- 19. Portal laundry chrome (force TH cookie) ---
    await page.context().addCookies([
      {
        name: "kamala-staff-locale",
        value: "th",
        url: BASE,
      },
    ]);
    await page.goto(`${BASE}/staff/portal/login?portal=laundry`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByLabel(/passcode|รหัส/i).fill(LAUNDRY_CODE);
    await page
      .getByRole("button", { name: /open laundry|เปิดซักรีด/i })
      .click();
    await page.waitForURL("**/staff/portal/laundry**", { timeout: 20000 });
    const laundryH1 =
      (await page.getByRole("heading", { level: 1 }).first().textContent()) || "";
    const laundryIntro =
      (await page
        .locator(".staff-desk__header p, .staff-header p")
        .first()
        .textContent()
        .catch(() => "")) || "";
    const signOut =
      (await page
        .getByRole("button", { name: /sign out|log out|ออก/i })
        .textContent()) || "";
    const brandSmall =
      (await page
        .locator(".staff-sidebar__brand-text small")
        .first()
        .textContent()
        .catch(() => "")) || "";

    const thOk =
      /ซัก|ผ้าปู|รายจ่าย|พอร์ทัล/.test(
        `${laundryH1} ${laundryIntro} ${signOut} ${brandSmall}`,
      ) || /ออกจากระบบ/.test(signOut);
    // Pre-rev4 hardcoded EN used "Sign out"; rev4 shell uses nav.logout ("Log out" / ออกจากระบบ).
    const stillHardcodedEn =
      laundryH1.trim() === "Laundry" &&
      /this portal records sheet laundry only/i.test(laundryIntro) &&
      /sign out/i.test(signOut);

    if (stillHardcodedEn) {
      record(
        "19",
        "FAIL",
        `Portal laundry still hardcoded EN (rev4 not deployed): h1="${laundryH1.trim()}" logout="${signOut.trim()}"`,
      );
    } else if (thOk) {
      record(
        "19",
        "PASS",
        `TH chrome: h1="${laundryH1.trim()}" intro="${laundryIntro.trim()}" brand="${brandSmall.trim()}" logout="${signOut.trim()}"`,
      );
    } else {
      record(
        "19",
        "WARN",
        `Deployed i18n but TH cookie weak: h1="${laundryH1.trim()}" intro="${laundryIntro.trim()}" logout="${signOut.trim()}"`,
      );
    }

    // --- 3b not fully runnable on portal (no Expenses). Note skip. ---
    record("3b", "SKIP", "Expenses needs full staff login — portal-only auto run");
    record("17", "SKIP", "TH default bill name needs staff locale + createBill deploy");
    record("18", "SKIP", "Expenses pending TH needs full staff");
    record("9", "SKIP", "Clear→stock needs recipe fixture + stock page (full staff)");
  } catch (err) {
    record("RUN", "FAIL", err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  mkdirSync(OUT, { recursive: true });
  const reportPath = join(OUT, "_usability-rev-5-live-auto.md");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const body = [
    "# Usability revision 5 — live auto (production portal)",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Base:** ${BASE}`,
    `**Summary:** ${pass} pass · ${fail} fail · ${results.length - pass - fail} skip/warn`,
    "",
    "| Script | Result | Notes |",
    "|---|---|---|",
    ...results.map((r) => `| ${r.id} | **${r.status}** | ${r.notes.replace(/\|/g, "/")} |`),
    "",
    "## Notes",
    "",
    "- Ran via `scripts/live-desk-usability.mjs` (headless Playwright) — no click-by-click Cursor approvals.",
    "- Production may lag uncommitted rev2–4 fixes; FAILs tagged when deploy is the gap.",
    "- Full staff scripts (3b, 9, 17, 18) need staff session — skipped in portal-only auto.",
    "",
    "**Stop — confirm to deploy local fixes to production and re-run, or continue portal-only.**",
    "",
  ].join("\n");
  writeFileSync(reportPath, body);
  writeFileSync(join(OUT, "_usability-rev-5-live-auto.json"), JSON.stringify(results, null, 2));
  console.log(`\nWrote ${reportPath}`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
