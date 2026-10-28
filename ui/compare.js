// The compare screen: what changed between two sessions.
// Open it as compare.html?group=GROUP_ID, or add &a=1&b=2 to pick the sessions.
import { loadGroup } from "../core/data.js";
import { compareSessions, newLinkPairs } from "../core/compare.js";
import { el, getParam, urlFor, showError, formatNumber } from "./app.js";
import { drawPicture, pictureKey } from "./picture.js";

const groupId = getParam("group");
const main = document.querySelector("main");
// Kept in one place so changing a dropdown redraws just this part.
const comparison = el("div", {});

start();

async function start() {
  if (!groupId) {
    main.replaceChildren(
      el("p", { className: "error" }, "This link is missing the group. Open Compare sessions from a group's screen."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    return;
  }

  let group;
  try {
    group = await loadGroup(groupId);
  } catch (error) {
    main.replaceChildren(
      el("h1", {}, "Couldn't load this group"),
      el("p", {}, "The link might be wrong, or the internet might be down."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    showError(error);
    return;
  }
  document.title = `Compare sessions · ${group.name} · Connected`;

  const header = [
    el("a", { href: urlFor("group.html", { group: group.id }) }, "← Back to the group"),
    el("p", { className: "muted" }, group.name),
    el("h1", {}, "Compare sessions"),
  ];
  if (group.sessions.length < 2) {
    main.replaceChildren(...header, el("p", { className: "card" }, "This group needs at least 2 sessions to compare."));
    return;
  }

  const numbers = group.sessions.map((s) => s.number);
  // Missing from the address means "use the default". Given but wrong gets a
  // message, so a leader never sees a different session than they asked for.
  const asked = [getParam("a"), getParam("b")];
  const unknown = asked.filter((value) => value && !numbers.includes(Number(value)));
  const pick = (value, fallback) => (numbers.includes(Number(value)) ? Number(value) : fallback);
  const before = sessionPicker(group, "before", pick(asked[0], Math.min(...numbers)));
  const after = sessionPicker(group, "after", pick(asked[1], Math.max(...numbers)));
  const addressError = unknown.length > 0
    ? el("p", { className: "error" },
      `${group.name} doesn't have session ${unknown.join(" or ")}, so the first and last sessions are shown. Pick others below.`)
    : null;

  function onChange() {
    const a = Number(before.value);
    const b = Number(after.value);
    // Keeps the choice in the address, so a refresh or a shared link shows the same sessions.
    history.replaceState(null, "", urlFor("compare.html", { group: group.id, a, b }));
    addressError?.remove();
    showComparison(group, a, b);
  }
  before.onchange = onChange;
  after.onchange = onChange;

  main.replaceChildren(...[
    ...header,
    addressError,
    el("div", { className: "pickers" },
      el("div", {}, el("label", { htmlFor: "before" }, "Before"), before),
      el("div", {}, el("label", { htmlFor: "after" }, "After"), after),
    ),
    comparison,
  ].filter(Boolean));
  showComparison(group, Number(before.value), Number(after.value));
}

function sessionPicker(group, id, selected) {
  const select = el("select", { id },
    group.sessions.map((s) => el("option", { value: s.number }, [`Session ${s.number}`, s.date].filter(Boolean).join(" · "))),
  );
  select.value = String(selected);
  return select;
}

function showComparison(group, a, b) {
  if (a === b) {
    comparison.replaceChildren(el("p", { className: "card" }, "Before and After are the same session. Pick two different sessions to compare."));
    return;
  }

  const result = compareSessions(group, a, b);
  comparison.replaceChildren(...[
    result.warning ? el("p", { className: "warning" }, result.warning) : null,
    pictures(group, a, b),
    el("p", { className: "muted" }, "Only kids who came to both sessions are compared."),
    el("section", { className: "stats" },
      stat(result.bothPresent, "Kids at both sessions"),
      stat(result.newLinks, "New connections"),
      stat(result.lostLinks, "Lost connections"),
      stat(result.stillIsolated, "Kids with no connections both times"),
    ),
    ratings(result),
  ].filter(Boolean));
}

function pictures(group, a, b) {
  return el("section", { className: "card" },
    el("div", { className: "picture-pair" },
      el("div", {}, el("h2", {}, `Before: session ${a}`), drawPicture(group, a)),
      el("div", {}, el("h2", {}, `After: session ${b}`), drawPicture(group, b, { highlight: newLinkPairs(group, a, b) })),
    ),
    pictureKey({ showNew: true }),
  );
}

function stat(value, label) {
  return el("div", { className: "stat" },
    el("div", { className: "value" }, String(value)),
    el("div", { className: "label" }, label),
  );
}

function ratings(result) {
  const row = (question, rating) => el("tr", {},
    el("th", {}, question),
    el("td", {}, formatNumber(rating.before, 2)),
    el("td", {}, formatNumber(rating.after, 2)),
    el("td", {}, signed(rating.change)),
    el("td", {}, String(rating.count)),
  );
  return el("section", {},
    el("h2", {}, "How kids felt"),
    el("table", {},
      el("thead", {}, el("tr", {}, ["", "Before", "After", "Change", "Kids"].map((text) => el("th", {}, text)))),
      el("tbody", {},
        row("Q4: how close they feel to the group", result.q4),
        row("Q5: how much they feel they belong", result.q5),
      ),
    ),
  );
}

// "+1.00" for a rise. A tiny drop would round to "-0.00", which looks like a
// fall that didn't happen, so it shows as "0.00".
function signed(change) {
  const text = formatNumber(change, 2);
  if (text === "-0.00") return "0.00";
  return change > 0 && text !== "0.00" ? `+${text}` : text;
}
