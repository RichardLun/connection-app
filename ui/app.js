// Small helpers that every screen uses. The table in "The helpers in
// ui/app.js" in docs/frontend-steps.md shows how to use each one.
import { KINDS } from "../core/questions.js";

// Reads a value from the page's address. On group.html?group=abc,
// getParam("group") gives "abc".
export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// Builds an address for another screen, like
// urlFor("results.html", { group: "abc", session: 2 }).
export function urlFor(page, params = {}) {
  return `${page}?${new URLSearchParams(params)}`;
}

// The full address of another screen, starting with https://. Use it for
// links that leave the app, like a QR code or a link sent in a group chat.
export function fullUrl(page, params = {}) {
  return new URL(urlFor(page, params), location.href).href;
}

// Makes a page element, like el("button", { onclick: save }, "Save").
// Text goes in as plain text, so a name like "Ana <3" shows up exactly as
// typed instead of being read as HTML.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...cleanChildren(children));
  return node;
}

// Same idea as el(), for the parts of a picture: svg, circle, line, text.
// Pictures need a different kind of element, or the browser won't draw them.
export function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...cleanChildren(children));
  return node;
}

// Lets screens pass lists of children, and skip one with null or false.
function cleanChildren(children) {
  return children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);
}

// Shows a red message at the top of the page, so a failed save or load is
// never silent. The full error also goes to the console.
export function showError(error, target) {
  console.error(error);
  if (target) {
    target.replaceChildren(el("p", { className: "error", role: "alert" }, error.message ?? String(error)));
    return;
  }
  let box = document.getElementById("error");
  if (!box) {
    box = el("p", { id: "error", className: "error", role: "alert" });
    document.querySelector("main").prepend(box);
  }
  box.textContent = `Something went wrong: ${error?.message ?? error}`;
}

// Rounds a number for the screen. The calculations keep full precision,
// and give null when there isn't enough data to work a number out.
export function formatNumber(value, decimals = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return value.toFixed(decimals);
}

// Today's date as "2026-10-24", in the leader's own time zone.
// (toISOString() would use London time, which is a day off some evenings.)
export function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The choices the database accepts, with the words a leader sees.
export const PROGRAM_TYPES = [
  { value: "after_school", label: "After school" },
  { value: "sports", label: "Sports" },
  { value: "arts", label: "Arts" },
  { value: "camp", label: "Camp" },
  { value: "faith", label: "Faith" },
  { value: "classroom", label: "Classroom" },
  { value: "other", label: "Other" },
];

export const ACTIVITY_TYPES = [
  { value: "pairs", label: "Pairs" },
  { value: "small_groups_leader_chose", label: "Small groups (leader chose)" },
  { value: "small_groups_kids_chose", label: "Small groups (kids chose)" },
  { value: "whole_group_game", label: "Whole-group game" },
  { value: "whole_group_discussion", label: "Whole-group discussion" },
  { value: "free_time", label: "Free time" },
  { value: "other", label: "Other" },
];

// Turns a saved value into its label: labelFor(ACTIVITY_TYPES, "free_time")
// gives "Free time". Gives "" for an empty or unknown value.
export function labelFor(list, value) {
  return list.find((item) => item.value === value)?.label ?? "";
}

// A small tag saying what kind of question a result comes from, like
// "Belonging". Every result on screen gets one, so kinds are never mixed up.
export function kindTag(kind) {
  return el("span", { className: `kind kind-${kind}`, title: KINDS[kind].asks }, KINDS[kind].label);
}

// "4:05 pm" in the leader's own time zone, from a saved time.
export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// When the check-ins were answered, like "Answered 4:01 pm to 4:20 pm".
export function answeredWhen(from, to) {
  if (!from) return "No check-ins yet";
  const day = (iso) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
  const start = `${day(from)}, ${formatTime(from)}`;
  if (from === to) return `Answered ${start}`;
  const end = day(from) === day(to) ? formatTime(to) : `${day(to)}, ${formatTime(to)}`;
  return `Answered ${start} to ${end}`;
}

// Saves text as a file, for the CSV and Gephi downloads.
export function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = el("a", { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A file name made from the group name, like "fake-site-session-2".
export function fileName(...parts) {
  return parts.join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "connected";
}
