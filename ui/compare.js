// The compare screen: what changed between two sessions.
// Open it as compare.html?group=GROUP_ID, or add &a=1&b=2 to pick the sessions.
import { loadGroup } from "../core/data.js";
import { compareSessions, newLinkPairs } from "../core/compare.js";
import { QUESTIONS } from "../core/questions.js";
import { CHECK_IN_TIMINGS, optionLabel, isSingleActivity } from "../core/settings.js";
import { el, getParam, urlFor, showError, formatNumber, kindTag } from "./app.js";
import { drawPicture, pictureKey } from "./picture.js";
import { comparisonOverviewData } from "../core/overview.js";
import { overviewCard } from "./overview.js";

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
  if (isSingleActivity(group)) {
    main.replaceChildren(...header, el("p", { className: "card" }, "This is a single activity, so there's nothing to compare."));
    return;
  }
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
    warnings(result, a, b).map((text) => el("p", { className: "warning" }, text)),
    result.warning ? el("p", { className: "warning" }, result.warning) : null,
    respondents(result, a, b),
    result.hasNetwork ? overviewCard(comparisonOverviewData(group, a, b)) : null,
    result.hasNetwork
      ? [
        el("h2", {}, kindTag("interaction"), "Who worked with or talked to whom"),
        pictures(group, a, b),
        el("p", { className: "muted" }, "Only kids who came to both sessions are compared."),
        el("section", { className: "stats" },
          stat(result.bothPresent, "Kids at both sessions"),
          stat(result.newLinks, "New connections"),
          stat(result.lostLinks, "Lost connections"),
          stat(result.stillIsolated, "Answered both times, no reported connections both times"),
        ),
      ]
      : el("p", { className: "card" }, "These sessions didn't ask who kids worked with or talked to, so there's no network to compare."),
    ratings(result, a, b),
  ].flat().filter(Boolean));
}

// Things that make the two sessions harder to compare, in plain words.
function warnings(result, a, b) {
  const list = [];
  const r = result.respondents;
  if (r.same === false) {
    list.push(`Different kids checked in each time: ${r.checkedInBoth} both times, ${r.onlyBefore} only in session ${a}, ` +
      `${r.onlyAfter} only in session ${b}. An average for everyone can change even if nobody feels any different, ` +
      "so look at the \"Answered both times\" columns for changes.");
  }
  if (r.same === null) {
    list.push("Check-ins are anonymous, so we can't tell whether the same kids answered both times. " +
      "A change in the averages might only mean different kids answered.");
  }
  if (!result.questions.same) {
    const names = (ids) => ids.map((id) => QUESTIONS[id].label).join(", ");
    const parts = [];
    if (result.questions.onlyBefore.length > 0) parts.push(`only session ${a} asked: ${names(result.questions.onlyBefore)}`);
    if (result.questions.onlyAfter.length > 0) parts.push(`only session ${b} asked: ${names(result.questions.onlyAfter)}`);
    list.push(`The sessions asked different questions (${parts.join("; ")}). Only questions asked both times are compared.`);
  }
  if (!result.timing.same) {
    const when = (value) => optionLabel(CHECK_IN_TIMINGS, value).toLowerCase() || "not recorded";
    list.push(`Kids checked in at different times: ${when(result.timing.before)} in session ${a}, ` +
      `${when(result.timing.after)} in session ${b}. Answers given at different times may not be comparable.`);
  }
  return list;
}

function respondents(result, a, b) {
  const r = result.respondents;
  const show = (value) => (value === null ? "not recorded" : String(value));
  return el("section", {},
    el("h2", {}, "Who came and who answered"),
    el("table", {},
      el("thead", {}, el("tr", {}, ["", `Session ${a}`, `Session ${b}`].map((text) => el("th", {}, text)))),
      el("tbody", {},
        el("tr", {}, el("th", {}, "Attended"), el("td", {}, show(r.before.attended)), el("td", {}, show(r.after.attended))),
        el("tr", {}, el("th", {}, "Checked in"), el("td", {}, String(r.before.checkedIn)), el("td", {}, String(r.after.checkedIn))),
      ),
    ),
    el("p", {}, r.checkedInBoth === null
      ? "Checked in both times: can't tell, because check-ins are anonymous."
      : `Checked in both times: ${r.checkedInBoth}`),
  );
}

function pictures(group, a, b) {
  return el("section", { className: "card" },
    el("div", { className: "picture-pair" },
      el("div", {}, el("h2", {}, `Before: Session ${a}`), drawPicture(group, a)),
      el("div", {}, el("h2", {}, `After: Session ${b}`), drawPicture(group, b, { highlight: newLinkPairs(group, a, b) })),
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

// Each rating question on its own row, with its own scale. "Everyone" uses
// every kid who answered that time; "answered both times" only kids who were
// at both sessions and answered the question both times.
function ratings(result, a, b) {
  if (result.ratings.length === 0) return null;
  const row = (rating) => {
    const asked = rating.askedBefore && rating.askedAfter;
    const n = (count) => ` (${count})`;
    return el("tr", {},
      el("th", {}, kindTag(QUESTIONS[rating.id].kind), `${rating.label}, ${rating.min} to ${rating.max}`),
      el("td", {}, rating.askedBefore ? formatNumber(rating.everyone.before, 2) + n(rating.everyone.beforeCount) : "not asked"),
      el("td", {}, rating.askedAfter ? formatNumber(rating.everyone.after, 2) + n(rating.everyone.afterCount) : "not asked"),
      rating.paired && asked
        ? [
          el("td", {}, formatNumber(rating.paired.before, 2)),
          el("td", {}, formatNumber(rating.paired.after, 2)),
          el("td", {}, signed(rating.paired.change)),
          el("td", {}, String(rating.paired.count)),
        ]
        : el("td", { colSpan: 4 }, asked ? "can't pair anonymous answers" : "asked only once"),
    );
  };
  return el("section", {},
    el("h2", {}, "How kids felt"),
    el("p", { className: "muted" }, "Each question is shown on its own and never added up into one score."),
    el("div", { className: "table-scroll" },
      el("table", {},
        el("thead", {},
          el("tr", {}, ["", `Everyone, session ${a}`, `Everyone, session ${b}`, "Answered both times: before", "after", "change", "kids"]
            .map((text) => el("th", {}, text))),
        ),
        el("tbody", {}, result.ratings.map(row)),
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
