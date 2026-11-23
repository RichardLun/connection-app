// The results screen: one session's numbers, who to check on, and the picture.
// Open it as results.html?group=GROUP_ID&session=SESSION_NUMBER.
import { loadGroup } from "../core/data.js";
import { sessionNumbers } from "../core/numbers.js";
import { peopleToCheckOn, REASON_TEXT } from "../core/insights.js";
import { sessionReport } from "../core/report.js";
import { hasNetwork } from "../core/questions.js";
import { CHECK_IN_TIMINGS, optionLabel, showsIndividuals, asksInteractions } from "../core/settings.js";
import { el, getParam, urlFor, showError, formatNumber, labelFor, kindTag, answeredWhen, ACTIVITY_TYPES } from "./app.js";
import { drawPicture, pictureKey } from "./picture.js";
import { sessionOverviewData } from "../core/overview.js";
import { overviewCard } from "./overview.js";

const groupId = getParam("group");
const sessionNumber = Number(getParam("session"));
const main = document.querySelector("main");

start();

async function start() {
  if (!groupId || !Number.isInteger(sessionNumber) || sessionNumber < 1) {
    main.replaceChildren(
      el("p", { className: "error" }, "This link is missing the group or the session number. Open results from a session's screen."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    return;
  }

  let group;
  try {
    group = await loadGroup(groupId);
  } catch (error) {
    main.replaceChildren(
      el("h1", {}, "Couldn't load these results"),
      el("p", {}, "The link might be wrong, or the internet might be down."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    showError(error);
    return;
  }

  const session = group.sessions.find((s) => s.number === sessionNumber);
  if (!session) {
    main.replaceChildren(
      el("p", { className: "error" }, `${group.name} doesn't have a session ${sessionNumber}.`),
      el("a", { href: urlFor("group.html", { group: group.id }) }, "← Back to the group"),
    );
    return;
  }
  document.title = `Results · Session ${session.number} · ${group.name} · Connected`;
  draw(group, session);
}

function draw(group, session) {
  const details = [session.date, labelFor(ACTIVITY_TYPES, session.activityType)].filter(Boolean).join(" · ");
  const sessionLink = urlFor("session.html", { group: group.id, session: session.number });
  const reportLink = el("a", { className: "button secondary", href: urlFor("report.html", { group: group.id, session: session.number }) }, "Group report and export");
  const report = sessionReport(group, session.number);

  // Groups that don't ask who kids worked with or talked to have no network,
  // so everything they collected is on the report instead.
  if (!asksInteractions(group) || !hasNetwork(session)) {
    main.replaceChildren(
      el("a", { href: sessionLink }, "← Back"),
      el("h1", {}, `${report.activity.word} ${session.number} results`),
      el("p", { className: "card" }, report.noNetworkNote),
      el("div", { className: "actions" }, reportLink),
    );
    return;
  }

  main.replaceChildren(...[
    el("a", { href: sessionLink }, "← Back to the session"),
    el("p", { className: "muted" }, group.name),
    el("h1", {}, `${report.activity.word === "Activity" ? "Activity" : `Session ${session.number}`} results`),
    details ? el("p", { className: "muted" }, details) : null,
    el("p", { className: "muted" },
      [answeredWhen(report.activity.answeredFrom, report.activity.answeredTo),
        optionLabel(CHECK_IN_TIMINGS, session.checkInTiming)].filter(Boolean).join(" · ")),
    // With nobody here every number is empty, and "Who to check on" would
    // wrongly say everyone connected.
    session.present.length === 0
      ? el("p", { className: "card" },
        "Nobody is marked as here for this session, so there are no results yet. ",
        el("a", { href: sessionLink }, "Tick who's here on the session screen."))
      : [
        overviewCard(sessionOverviewData(group, session.number)),
        el("h2", {}, kindTag("interaction"), "Who worked with or talked to whom"),
        stats(sessionNumbers(group, session.number)),
        el("section", { className: "card" },
          el("h2", {}, "Who connected"),
          drawPicture(group, session.number),
          pictureKey(),
          showsIndividuals(group) ? null : el("p", { className: "muted" }, "Names are hidden: this group has group-only reports."),
        ),
        el("h2", {}, kindTag("belonging"), "How kids felt about the group"),
        el("p", { className: "muted" }, "A separate measure from who connected: a quiet kid may still feel they belong."),
        belonging(report),
        showsIndividuals(group) ? checkOn(group, session.number) : null,
      ],
    el("div", { className: "actions" }, reportLink),
    otherLinks(group, session.number),
  ].flat().filter(Boolean));
}

function stats(numbers) {
  return el("section", { className: "stats" },
    stat(numbers.present, "Kids here"),
    stat(numbers.answered, "Checked in"),
    stat(numbers.links, "Connections"),
    stat(formatNumber(numbers.density, 2), "Share of possible pairs who connected"),
    stat(numbers.isolates, "Answered, but no reported connections"),
    stat(numbers.unknown, "Not known: skipped the who-questions or didn't check in"),
    stat(formatNumber(numbers.centralization, 2), "How much the connections center on one kid (0 to 1)"),
    stat(formatNumber(numbers.averageLinks, 1), "Connections per kid, on average"),
  );
}

// One number per rating question, each with its own scale, never added up.
function belonging(report) {
  const ratings = report.sections.flatMap((s) => s.questions).filter((q) => q.kind === "belonging" && q.average !== undefined);
  if (ratings.length === 0) return el("p", { className: "muted" }, "No belonging questions were asked.");
  return el("section", { className: "stats" },
    ratings.map((q) => stat(formatNumber(q.average, 2), `${q.label} (${q.min} to ${q.max})`,
      `${q.answered} answered · ${q.skipped} skipped`)),
  );
}

function stat(value, label, note) {
  return el("div", { className: "stat" },
    el("div", { className: "value" }, String(value)),
    note ? el("div", { className: "label" }, note) : null,
    el("div", { className: "label" }, label),
  );
}

function checkOn(group, number) {
  const people = peopleToCheckOn(group, number);
  return el("section", { className: "card" },
    el("h2", {}, "Who to check on"),
    el("p", { className: "muted" }, "Only on your screen, because this group has leader support. Never in exports or the report."),
    people.length === 0
      ? el("p", {}, "Everyone connected with someone this session.")
      : el("ul", { className: "list" },
        people.map((person) => el("li", {}, el("strong", {}, person.name), ` · ${REASON_TEXT[person.reason]}`)),
      ),
  );
}

// The nearest lower and higher numbers, so a gap like 3 then 5 still links up.
function otherLinks(group, number) {
  const numbers = group.sessions.map((s) => s.number);
  const earlier = numbers.filter((n) => n < number);
  const later = numbers.filter((n) => n > number);
  const previous = earlier.length > 0 ? Math.max(...earlier) : null;
  const next = later.length > 0 ? Math.min(...later) : null;
  const resultsLink = (n, text) => el("a", { className: "button secondary", href: urlFor("results.html", { group: group.id, session: n }) }, text);

  return el("div", { className: "actions" },
    previous !== null ? resultsLink(previous, `← Session ${previous}`) : null,
    next !== null ? resultsLink(next, `Session ${next} →`) : null,
    numbers.length >= 2 && group.groupType !== "single_activity"
      ? el("a", { className: "button secondary", href: urlFor("compare.html", { group: group.id }) }, "Compare sessions")
      : null,
  );
}
