/**
 * Split staff/calendar rules out of app/globals.css so guests don't download them.
 * Deletes dead .staff-room-ical* rules (iCal removed).
 *
 * Usage: node scripts/split-staff-css.mjs
 * Requires a full (unsplit) app/globals.css.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const GLOBALS = "app/globals.css";
const STAFF_OPS = "app/staff-ops.css";
const STAFF_CALENDAR = "app/staff-calendar.css";

const css = readFileSync(GLOBALS, "utf8");
const root = postcss.parse(css, { from: GLOBALS });

/** No \\b after BEM roots — `__` is a word char and would miss modifiers. */
function isCalendarSelector(selector) {
  return (
    /\.staff-main--calendar/.test(selector) ||
    /\.staff-extranet/.test(selector) ||
    /\.extranet-/.test(selector) ||
    /\.calendar-/.test(selector) ||
    /\.bulk-availability/.test(selector) ||
    /\.staff-calendar-/.test(selector) ||
    /\.staff-timeline/.test(selector)
  );
}

function isDeadIcalSelector(selector) {
  return /\.staff-room-ical/.test(selector);
}

function isStaffSelector(selector) {
  if (isDeadIcalSelector(selector)) return true;
  return (
    /\.staff-/.test(selector) ||
    /html\.staff-busy/.test(selector) ||
    /\.booking-board/.test(selector) ||
    /\.booking-list/.test(selector) ||
    /\.booking-row/.test(selector) ||
    /\.reservation-detail/.test(selector) ||
    /\.calendar-/.test(selector) ||
    /\.extranet-/.test(selector) ||
    /\.bulk-availability/.test(selector) ||
    /\.checkbox-field\b/.test(selector) ||
    /\.rooms-photo-/.test(selector)
  );
}

function classifySelector(selector) {
  const s = selector.trim();
  if (!s) return "guest";
  if (isDeadIcalSelector(s)) return "drop";
  if (isCalendarSelector(s)) return "calendar";
  if (isStaffSelector(s)) return "ops";
  return "guest";
}

function splitSelectorList(selector) {
  const parts = selector.split(",").map((part) => part.trim()).filter(Boolean);
  const guest = [];
  const ops = [];
  const calendar = [];
  let drop = false;

  for (const part of parts) {
    const kind = classifySelector(part);
    if (kind === "drop") drop = true;
    else if (kind === "calendar") calendar.push(part);
    else if (kind === "ops") ops.push(part);
    else guest.push(part);
  }

  return {
    guest,
    ops,
    calendar,
    dropAll: drop && !guest.length && !ops.length && !calendar.length,
  };
}

function cloneRuleWithSelector(rule, selector) {
  const clone = rule.clone();
  clone.selector = selector;
  return clone;
}

function isStaffKeyframe(name) {
  return /^(staff-|calendar-)/.test(name) || name === "pulse-urgent" || name === "staff-status-pulse";
}

const guestRoot = postcss.root();
const opsRoot = postcss.root();
const calendarRoot = postcss.root();

opsRoot.append(
  postcss.comment({
    text: " Staff ops (shell, inbox, settings, gallery, rooms) — loaded via app/staff/layout.tsx ",
  }),
);
calendarRoot.append(
  postcss.comment({
    text: " Staff calendar / timeline — loaded via app/staff/layout.tsx ",
  }),
);

function processContainer(nodes, guestParent, opsParent, calendarParent) {
  for (const node of nodes) {
    if (node.type === "comment") {
      guestParent.append(node.clone());
      continue;
    }

    if (node.type === "atrule" && node.name === "keyframes") {
      const name = node.params.trim();
      if (isStaffKeyframe(name)) {
        (name.startsWith("calendar-") ? calendarParent : opsParent).append(node.clone());
      } else {
        guestParent.append(node.clone());
      }
      continue;
    }

    if (node.type === "atrule" && (node.name === "media" || node.name === "supports")) {
      const guestMedia = node.clone({ nodes: [] });
      const opsMedia = node.clone({ nodes: [] });
      const calendarMedia = node.clone({ nodes: [] });
      processContainer(node.nodes ?? [], guestMedia, opsMedia, calendarMedia);
      if (guestMedia.nodes?.length) guestParent.append(guestMedia);
      if (opsMedia.nodes?.length) opsParent.append(opsMedia);
      if (calendarMedia.nodes?.length) calendarParent.append(calendarMedia);
      continue;
    }

    if (node.type === "atrule") {
      guestParent.append(node.clone());
      continue;
    }

    if (node.type === "rule") {
      const { guest, ops, calendar, dropAll } = splitSelectorList(node.selector);
      if (dropAll) continue;
      if (guest.length) guestParent.append(cloneRuleWithSelector(node, guest.join(",\n")));
      if (ops.length) opsParent.append(cloneRuleWithSelector(node, ops.join(",\n")));
      if (calendar.length) {
        calendarParent.append(cloneRuleWithSelector(node, calendar.join(",\n")));
      }
      continue;
    }

    guestParent.append(node.clone());
  }
}

processContainer(root.nodes, guestRoot, opsRoot, calendarRoot);

function serialize(rootNode) {
  return `${rootNode.toString().replace(/\n{3,}/g, "\n\n")}\n`;
}

writeFileSync(GLOBALS, serialize(guestRoot));
writeFileSync(STAFF_OPS, serialize(opsRoot));
writeFileSync(STAFF_CALENDAR, serialize(calendarRoot));

console.log(
  JSON.stringify(
    {
      guestKB: Math.round(Buffer.byteLength(serialize(guestRoot)) / 1024),
      opsKB: Math.round(Buffer.byteLength(serialize(opsRoot)) / 1024),
      calendarKB: Math.round(Buffer.byteLength(serialize(calendarRoot)) / 1024),
    },
    null,
    2,
  ),
);
