// The results screen: one session's numbers, who to check on, and the picture.
// Open it as results.html?group=GROUP_ID&session=SESSION_NUMBER.
import { loadGroup } from "../core/data.js";
import { sessionNumbers } from "../core/numbers.js";
import { peopleToCheckOn, REASON_TEXT } from "../core/insights.js";
import { el, getParam, urlFor, showError, formatNumber, labelFor, ACTIVITY_TYPES } from "./app.js";
import { drawPicture, pictureKey } from "./picture.js";

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

  main.replaceChildren(...[
    el("a", { href: sessionLink }, "← Back to the session"),
    el("p", { className: "muted" }, group.name),
    el("h1", {}, `Session ${session.number} results`),
    details ? el("p", { className: "muted" }, details) : null,
    // With nobody here every number is empty, and "Who to check on" would
    // wrongly say everyone connected.
    session.present.length === 0
      ? el("p", { className: "card" },
        "Nobody is marked as here for this session, so there are no results yet. ",
        el("a", { href: sessionLink }, "Tick who's here on the session screen."))
      : [
        stats(sessionNumbers(group, session.number)),
        el("section", { className: "card" },
          el("h2", {}, "Who connected"),
          drawPicture(group, session.number),
          pictureKey(),
        ),
        checkOn(group, session.number),
      ],
    otherLinks(group, session.number),
  ].flat().filter(Boolean));
}

function stats(numbers) {
  return el("section", { className: "stats" },
    stat(numbers.present, "Kids here"),
    stat(numbers.answered, "Checked in"),
    stat(numbers.links, "Connections"),
    stat(formatNumber(numbers.density, 2), "Share of possible pairs who connected"),
    stat(numbers.isolates, "Kids with no connections"),
    stat(numbers.unknown, "Didn't check in"),
    stat(formatNumber(numbers.centralization, 2), "How much the connections center on one kid (0 to 1)"),
    stat(formatNumber(numbers.averageLinks, 1), "Connections per kid, on average"),
    // The count goes on its own line under the number, because next to it the
    // number wraps onto two lines on a phone.
    stat(formatNumber(numbers.q4Average, 2), "How close kids feel to the group (Q4, 1 to 7)", `${numbers.q4Count} answered`),
    stat(formatNumber(numbers.q5Average, 2), "How much kids feel they belong (Q5, 1 to 5)", `${numbers.q5Count} answered`),
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
    numbers.length >= 2 ? el("a", { className: "button secondary", href: urlFor("compare.html", { group: group.id }) }, "Compare sessions") : null,
  );
}
