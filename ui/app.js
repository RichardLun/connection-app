// Small helpers that every screen uses. The table in "The helpers in
// ui/app.js" in docs/frontend-steps.md shows how to use each one.

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
export function showError(error) {
  console.error(error);
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
