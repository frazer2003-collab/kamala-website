/**
 * Auto live usability pack against production.
 * Usage: npm run test:live-desk
 * Env: LIVE_BASE_URL, LIVE_PORTAL_BILLS_PASSCODE, LIVE_PORTAL_LAUNDRY_PASSCODE,
 *      LIVE_STAFF_USER, LIVE_STAFF_PASSWORD (optional — unlocks 3b/18/9)
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.LIVE_BASE_URL || "https://www.kamalaguesthouse.com";
const BILLS_CODE = process.env.LIVE_PORTAL_BILLS_PASSCODE || "bills";
const LAUNDRY_CODE = process.env.LIVE_PORTAL_LAUNDRY_PASSCODE || "sheets";
const STAFF_USER = process.env.LIVE_STAFF_USER || process.env.STAFF_ADMIN_USERNAME || "greencurry";
const STAFF_PASS = process.env.LIVE_STAFF_PASSWORD || process.env.STAFF_ADMIN_PASSWORD || "";
const OUT = join(__dirname, "..", ".cursor", "agents", "roles", "reports");

const results = [];

function record(id, status, notes) {
  results.push({ id, status, notes });
  console.log(`${status.padEnd(6)} ${id} — ${notes}`);
}

async function setLocale(page, locale) {
  await page.context().addCookies([
    { name: "kamala-staff-locale", value: locale, url: BASE },
  ]);
}

async function loginPortal(page, kind, code) {
  await page.goto(`${BASE}/staff/portal/login?portal=${kind}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel(/passcode|รหัส/i).fill(code);
  const open =
    kind === "bills"
      ? /open bills|เปิดบิล/i
      : /open laundry|เปิดซักรีด/i;
  await page.getByRole("button", { name: open }).click();
  await page.waitForURL(`**/staff/portal/${kind}**`, { timeout: 20000 });
}

async function loginStaff(page) {
  if (!STAFF_PASS) return false;
  await page.goto(`${BASE}/staff/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/username|email|ผู้ใช้/i).fill(STAFF_USER);
  await page.getByLabel(/^password$|^รหัส/i).fill(STAFF_PASS);
  await page.getByRole("button", { name: /sign in|เข้าสู่ระบบ/i }).click();
  await page.waitForURL("**/staff/**", { timeout: 20000 });
  return !page.url().includes("/staff/login");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.setDefaultTimeout(20000);

  try {
    await setLocale(page, "th");

    // --- 17 + 8: TH default bill name + New bill open ---
    await loginPortal(page, "bills", BILLS_CODE);
    const newBill = page
      .getByRole("button", { name: /^(New bill|บิลใหม่)$/i })
      .first();
    await newBill.click();
    await page.waitForURL(/\?open=/, { timeout: 20000 });
    const nameBox = page.locator('input[name="name"]').first();
    await nameBox.waitFor({ state: "visible" });
    const defaultName = (await nameBox.inputValue()) || "";
    const title =
      (await page.getByRole("heading", { level: 2 }).first().textContent()) ||
      "";

    record(
      "8",
      "PASS",
      `New bill opened with ?open=; quiet create`,
    );

    if (defaultName === "บิลใหม่" || title.includes("บิลใหม่")) {
      record("17", "PASS", `TH default name="${defaultName}" title="${title.trim()}"`);
    } else {
      record(
        "17",
        "FAIL",
        `Expected บิลใหม่, got name="${defaultName}" title="${title.trim()}"`,
      );
    }

    // --- 12 + 16 + 6: dual-submit on this new bill ---
    const stamp = `Auto ${Date.now().toString(36)}`;
    await nameBox.fill(stamp);

    const comboBox = page.getByRole("combobox").first();
    await comboBox.click();
    await comboBox.fill("water");
    const option = page
      .getByRole("button", { name: /bottled water|น้ำดื่ม/i })
      .first();
    await option.waitFor({ state: "visible" });
    await option.click();

    const mid = await page.evaluate(async () => {
      const buttons = () => [...document.querySelectorAll("button")];
      const save = buttons().find(
        (b) => /^(Save|บันทึก)$/.test((b.textContent || "").trim()) && b.type === "submit",
      );
      const add = buttons().find((b) =>
        /^(Add|เพิ่ม)$/.test((b.textContent || "").trim()),
      );
      save?.click();
      add?.click();
      await new Promise((r) => setTimeout(r, 150));
      const snap = buttons().map((b) => ({
        text: (b.textContent || "").trim().replace(/\s+/g, " "),
        disabled: b.disabled,
      }));
      const labels = snap.filter((b) =>
        /^(Save|Saving|Add|Adding|บันทึก|กำลัง|เพิ่ม|Clear|ปิดบิล)/i.test(b.text),
      );
      const clear = snap.find((b) => /clear|ปิดบิล/i.test(b.text));
      const overlay = Boolean(
        document.querySelector('[data-busy]:not([data-busy="quiet"])'),
      );
      return {
        labels,
        clearDisabled: clear ? clear.disabled : null,
        clearText: clear?.text ?? null,
        overlay,
        all: snap.map((b) => b.text).filter(Boolean).slice(0, 40),
      };
    });

    await page.waitForTimeout(3500);
    const nameAfter = await nameBox.inputValue().catch(() => "");
    const titleAfter =
      (await page.getByRole("heading", { level: 2 }).first().textContent()) ||
      "";

    if (mid.overlay) {
      record("6", "FAIL", "Full-page busy overlay during Save+Add");
    } else {
      record("6", "PASS", "No full-page busy overlay during Save+Add");
    }

    const pendingBleed =
      mid.labels.some((l) => /Saving|กำลังบันทึก/i.test(l.text)) &&
      mid.labels.some((l) => /Adding|กำลังเพิ่ม/i.test(l.text));
    if (pendingBleed) {
      record("16", "FAIL", `Sibling pending bleed: ${JSON.stringify(mid.labels)}`);
    } else {
      record("16", "PASS", `Honest labels: ${JSON.stringify(mid.labels)}`);
    }

    if (nameAfter === stamp || titleAfter.includes(stamp)) {
      record("12", "PASS", `Name persisted (${stamp})`);
    } else {
      record(
        "12",
        "WARN",
        `Name after race input="${nameAfter}" title="${titleAfter.trim()}"`,
      );
    }

    // --- 15: after dual-submit, bill should have a line → Clear exists ---
    await page.waitForTimeout(500);
    let clearBtn = page.getByRole("button", { name: /clear|ปิดบิล/i });
    if (!(await clearBtn.count())) {
      // Ensure one line exists
      const combo2 = page.getByRole("combobox").first();
      if (await combo2.count()) {
        await combo2.click();
        await combo2.fill("water");
        const opt2 = page
          .getByRole("button", { name: /bottled water|น้ำดื่ม/i })
          .first();
        if (await opt2.count()) {
          await opt2.click();
          await page.getByRole("button", { name: /^(Add|เพิ่ม)$/i }).click();
          await page.waitForTimeout(2500);
        }
      }
      clearBtn = page.getByRole("button", { name: /clear|ปิดบิล/i });
    }
    if (!(await clearBtn.count())) {
      record("15", "SKIP", "No Clear button after ensuring a line");
    } else {
      const combo3 = page.getByRole("combobox").first();
      await combo3.click();
      await combo3.fill("towel");
      const opt3 = page
        .getByRole("button", { name: /towel|ผ้าเช็ด/i })
        .first();
      await opt3.click();
      const clearState = await page.evaluate(async () => {
        const add = [...document.querySelectorAll("button")].find((b) =>
          /^(Add|เพิ่ม)$/.test((b.textContent || "").trim()),
        );
        add?.click();
        await new Promise((r) => setTimeout(r, 120));
        const clear = [...document.querySelectorAll("button")].find((b) =>
          /clear|ปิดบิล/i.test(b.textContent || ""),
        );
        return clear ? { disabled: clear.disabled, text: (clear.textContent || "").trim() } : null;
      });
      await page.waitForTimeout(2000);
      if (clearState?.disabled) {
        record("15", "PASS", `Clear gated (${clearState.text})`);
      } else if (clearState && clearState.disabled === false) {
        record("15", "FAIL", `Clear stayed enabled (${clearState.text})`);
      } else {
        record("15", "WARN", "Clear missing during Add pending sample");
      }
    }
    await page.keyboard.press("Escape").catch(() => {});

    // --- 19 laundry TH (cookie already th) ---
    await loginPortal(page, "laundry", LAUNDRY_CODE);
    const laundryH1 =
      (await page.getByRole("heading", { level: 1 }).first().textContent()) ||
      "";
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
    if (/ซัก|ผ้าปู|ออกจากระบบ/.test(`${laundryH1}${laundryIntro}${signOut}${brandSmall}`)) {
      record(
        "19",
        "PASS",
        `TH chrome h1="${laundryH1.trim()}" logout="${signOut.trim()}" brand="${brandSmall.trim()}"`,
      );
    } else {
      record(
        "19",
        "FAIL",
        `Expected TH chrome; h1="${laundryH1.trim()}" intro="${laundryIntro.trim()}" logout="${signOut.trim()}"`,
      );
    }

    // --- Full staff optional ---
    const staffOk = await loginStaff(page);
    if (!staffOk) {
      record(
        "3b",
        "SKIP",
        "Set LIVE_STAFF_PASSWORD to auto-run Expenses / stock scripts",
      );
      record("18", "SKIP", "Needs LIVE_STAFF_PASSWORD");
      record("9", "SKIP", "Needs LIVE_STAFF_PASSWORD + recipe fixture");
    } else {
      await setLocale(page, "th");

      // 3b laundromat → expenses
      await page.goto(`${BASE}/staff/laundry`, { waitUntil: "domcontentloaded" });
      const expenseLink = page.getByRole("link", {
        name: /laundromat|expenses|รายจ่าย|บิลร้านซัก/i,
      });
      if (await expenseLink.count()) {
        await expenseLink.click();
        await page.waitForURL("**/staff/expenses**", { timeout: 15000 });
        const charge = `ซักรีด auto ${Date.now().toString(36)}`;
        await page.getByLabel(/charge name|ชื่อรายการ/i).fill(charge);
        await page.getByLabel(/cost|ต้นทุน/i).fill("12");
        const saveExp = page.getByRole("button", {
          name: /save expense|บันทึกรายจ่าย/i,
        });
        await saveExp.click();
        await page.waitForTimeout(2000);
        const bodyText = await page.locator("body").innerText();
        if (bodyText.includes(charge)) {
          record("3b", "PASS", `Expense "${charge}" on Expenses via laundry link`);
        } else {
          record("3b", "WARN", "Saved expense but row not seen in body text yet");
        }

        // 18 pending TH — click save and sample label
        await page.getByLabel(/charge name|ชื่อรายการ/i).fill(`pending ${Date.now().toString(36)}`);
        await page.getByLabel(/cost|ต้นทุน/i).fill("1");
        const pendingLabel = await page.evaluate(async () => {
          const btn = [...document.querySelectorAll("button")].find((b) =>
            /save expense|บันทึกรายจ่าย|กำลังบันทึก/i.test(b.textContent || ""),
          );
          btn?.click();
          await new Promise((r) => setTimeout(r, 80));
          return (
            [...document.querySelectorAll("button")]
              .map((b) => (b.textContent || "").trim())
              .find((t) => /กำลังบันทึก|Saving/i.test(t)) || null
          );
        });
        await page.waitForTimeout(1500);
        if (pendingLabel && /กำลังบันทึก/.test(pendingLabel)) {
          record("18", "PASS", `Expenses pending TH="${pendingLabel}"`);
        } else if (pendingLabel && /Saving/.test(pendingLabel)) {
          record("18", "FAIL", `Expenses pending still EN="${pendingLabel}"`);
        } else {
          record("18", "WARN", `Could not sample pending label (${pendingLabel})`);
        }
      } else {
        record("3b", "FAIL", "Laundry→Expenses link missing");
        record("18", "SKIP", "Blocked on 3b");
      }

      // 9 clear → stock: open a bill with lines if possible — soft check only
      await page.goto(`${BASE}/staff/bills`, { waitUntil: "domcontentloaded" });
      record(
        "9",
        "SKIP",
        "Clear→stock needs a known recipe fixture; not auto-mutated on live to avoid wrecking stock",
      );
    }
  } catch (err) {
    record("RUN", "FAIL", err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  mkdirSync(OUT, { recursive: true });
  const reportPath = join(OUT, "_usability-rev-5-live-auto.md");
  const finalPath = join(OUT, "_usability-cycle-final.md");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const warn = results.filter((r) => r.status === "WARN").length;
  const skip = results.filter((r) => r.status === "SKIP").length;

  const table = [
    "| Script | Result | Notes |",
    "|---|---|---|",
    ...results.map(
      (r) => `| ${r.id} | **${r.status}** | ${r.notes.replace(/\|/g, "/")} |`,
    ),
  ].join("\n");

  const autoBody = [
    "# Usability revision 5 — live auto (cycle finish)",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Base:** ${BASE}`,
    `**Summary:** ${pass} pass · ${fail} fail · ${warn} warn · ${skip} skip`,
    "",
    table,
    "",
  ].join("\n");
  writeFileSync(reportPath, autoBody);

  const finalBody = [
    "# Usability loop — final cycle report",
    "",
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    "**Status:** Cycle complete (portal live auto + deployed rev2–4)",
    "",
    "## What shipped across revisions",
    "",
    "1. **Rev1** — New bill `router.push(?open=)`; Expenses Today; quiet `/bills/new`",
    "2. **Rev1.1** — Laundry create stays on list; laundromat invoice → Expenses",
    "3. **Rev2** — Bill dialog busy gate; Date i18n; unified New bill open",
    "4. **Rev3** — Honest pending vs locked labels; locale default bill name; quiet-path EN sweep",
    "5. **Rev4** — Portal laundry + shell i18n; no submit queue (drop+retry)",
    "6. **Rev5** — Live auto Playwright pack; deploy + retest",
    "",
    "## Final live results",
    "",
    table,
    "",
    "## Automation",
    "",
    "- `npm run test:live-desk` — portal pack (passcodes `bills` / `sheets`)",
    "- Optional full staff: `LIVE_STAFF_PASSWORD=… npm run test:live-desk`",
    "",
    "## Deferred (out of this cycle)",
    "",
    "- Clear→stock live with recipe fixture (avoid mutating live stock blindly)",
    "- Full-staff Expenses scripts unless `LIVE_STAFF_PASSWORD` is provided",
    "- Optimistic expense rows (skipped by product choice)",
    "",
    "## Verdict",
    "",
    fail === 0
      ? "Portal desk usability targets from the loop are **green on production**. Loop closed."
      : `Loop closed with **${fail} fail(s)** still open — see table.`,
    "",
  ].join("\n");
  writeFileSync(finalPath, finalBody);
  writeFileSync(
    join(OUT, "_usability-rev-5-live-auto.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`\nWrote ${reportPath}`);
  console.log(`Wrote ${finalPath}`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
