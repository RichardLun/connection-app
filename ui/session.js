// The session screen: who's here, check-in progress, and links to the check-in and results.
// Open it as session.html?group=GROUP_ID&session=SESSION_NUMBER.
import { loadGroup, setPresent, updateSession } from "../core/data.js";
import { sessionNumbers } from "../core/numbers.js";
import { sessionQuestions, hasNetwork } from "../core/questions.js";
import { CHECK_IN_TIMINGS, optionLabel, usesNames, asksInteractions, sessionWord } from "../core/settings.js";
import { checkIns as countedCheckIns } from "../core/responses.js";
import { el, getParam, urlFor, fullUrl, showError, labelFor, kindTag, ACTIVITY_TYPES } from "./app.js";
import { qrCode } from "./qr.js";

const groupId = getParam("group");
const sessionNumber = Number(getParam("session"));
const main = document.querySelector("main");
// Kept in one place so Refresh can redraw just this part.
const checkIns = el("section", {});
const nameList = new Intl.ListFormat("en", { type: "conjunction" });

let group; // everything about the group, from loadGroup
let session; // this session, from group.sessions

start();

async function start() {
  if (!groupId || !Number.isInteger(sessionNumber) || sessionNumber < 1) {
    main.replaceChildren(
      el("p", { className: "error" }, "This link is missing the group or the session number. Open a session from its group's screen."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    return;
  }

  main.replaceChildren(el("p", { className: "muted" }, "Loading..."));
  try {
    await load();
  } catch (error) {
    main.replaceChildren(
      el("h1", {}, "Couldn't load this session"),
      el("p", {}, "The link might be wrong, or the internet might be down."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    showError(error);
    return;
  }

  if (!session) {
    main.replaceChildren(
      el("p", { className: "error" }, `${group.name} doesn't have a session ${sessionNumber}.`),
      backLink(),
    );
    return;
  }
  document.title = `${title()} · ${group.name} · Connected`;
  draw();
}

async function load() {
  group = await loadGroup(groupId);
  session = group.sessions.find((s) => s.number === sessionNumber);
}

function draw(saved = false) {
  const details = [session.date, labelFor(ACTIVITY_TYPES, session.activityType)].filter(Boolean).join(" · ");
  showCheckIns();
  fill(main,
    backLink(),
    el("h1", {}, title()),
    details ? el("p", { className: "muted" }, details) : null,
    session.activityNote ? el("p", {}, session.activityNote) : null,
    planCard(),
    usesNames(group) ? whosHere(saved) : headcount(saved),
    checkInLinks(),
    checkIns,
    el("div", { className: "actions" },
      asksInteractions(group) && hasNetwork(session)
        ? el("a", { className: "button", href: urlFor("results.html", { group: group.id, session: session.number }) }, "See results")
        : null,
      el("a", { className: "button secondary", href: urlFor("report.html", { group: group.id, session: session.number }) }, "Group report"),
    ),
  );
}

function title() {
  return group.groupType === "single_activity" ? "Activity" : `Session ${session.number}`;
}

// What this check-in asks, and when. The goal can change any time; the
// learning question only until the first kid checks in, so everyone who
// answers it was asked the same thing.
function planCard() {
  const started = session.answers.length > 0 || (session.anonymousAnswers ?? []).length > 0;
  const goal = el("textarea", { id: "goal", rows: 2, maxLength: 500, value: session.activityGoal ?? "" });
  const learning = el("textarea", {
    id: "learning", rows: 2, maxLength: 500, value: session.learningQuestion ?? "", disabled: started,
  });
  const status = el("span", { className: "muted" });
  const save = el("button", { type: "submit", className: "secondary" }, "Save");

  async function onSubmit(event) {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Saving...";
    try {
      const changes = { activityGoal: goal.value.trim() || null };
      if (!started) changes.learningQuestion = learning.value.trim() || null;
      await updateSession(session.id, changes);
      await load();
    } catch (error) {
      showError(error);
      status.textContent = "";
      save.disabled = false;
      return;
    }
    draw();
  }

  return el("form", { className: "card", onsubmit: onSubmit },
    el("h2", {}, "What this check-in asks"),
    el("p", { className: "muted" }, `When: ${optionLabel(CHECK_IN_TIMINGS, session.checkInTiming) || "not recorded"}`),
    el("ul", { className: "list" },
      sessionQuestions(session).map((q) => el("li", {}, kindTag(q.kind), q.wording ?? "")),
    ),
    el("label", { htmlFor: "goal" }, "Activity goal"),
    el("p", { className: "muted field-hint" }, "Optional. What kids should be able to identify or do afterwards."),
    goal,
    el("label", { htmlFor: "learning" }, "Learning question"),
    el("p", { className: "muted field-hint" },
      started
        ? "Kids have started checking in, so the learning question can't change now."
        : "Optional. Shown to kids at check-in when filled in."),
    learning,
    el("div", { className: "actions" }, save, status),
  );
}

// Groups without names can't tick who's here, so the leader types how many
// took part. The report needs it to say how many answered out of how many.
function headcount(saved) {
  const count = el("input", { type: "number", id: "attended", min: 0, step: 1, value: session.attendedCount ?? "" });
  const status = el("span", { className: "muted" }, saved ? "Saved" : "");
  const save = el("button", { type: "submit" }, "Save");

  async function onSubmit(event) {
    event.preventDefault();
    const value = count.value === "" ? null : Number(count.value);
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      count.reportValidity();
      return;
    }
    save.disabled = true;
    status.textContent = "Saving...";
    try {
      await updateSession(session.id, { attendedCount: value });
      await load();
    } catch (error) {
      showError(error);
      status.textContent = "";
      save.disabled = false;
      return;
    }
    draw(true);
  }

  return el("form", { className: "card", onsubmit: onSubmit },
    el("h2", {}, "How many took part"),
    el("label", { htmlFor: "attended" }, `Kids at this ${sessionWord(group).toLowerCase()}`),
    count,
    el("div", { className: "actions" }, save, status),
  );
}

function whosHere(saved) {
  const boxes = byName(group.people).map((person) => ({
    person,
    box: el("input", { type: "checkbox", checked: session.present.includes(person.id) }),
  }));
  const status = el("span", { className: "muted" }, saved ? "Saved" : "");
  const save = el("button", { type: "submit" }, "Save");

  async function onSubmit(event) {
    // Without this, the browser would reload the page instead of saving.
    event.preventDefault();
    // Stops a double click from saving twice at once.
    save.disabled = true;
    status.textContent = "Saving...";
    try {
      await setPresent(session.id, boxes.filter(({ box }) => box.checked).map(({ person }) => person.id));
      // Loaded again so the check-ins and the warning match what was saved.
      await load();
    } catch (error) {
      showError(error);
      status.textContent = "";
      save.disabled = false;
      return;
    }
    draw(true);
  }

  // Saves big groups a lot of taps. It doesn't save until Save is pressed.
  const tickEveryone = el("button", {
    type: "button",
    className: "secondary",
    onclick: () => {
      for (const { box } of boxes) box.checked = true;
      status.textContent = "";
    },
  }, "Tick everyone");

  return el("form", { className: "card", onsubmit: onSubmit, onchange: () => { status.textContent = ""; } },
    el("h2", {}, "Who's here"),
    group.people.length === 0
      ? el("p", { className: "muted" }, "This group has no kids yet. Add them on the group's screen.")
      : boxes.map(({ person, box }) => el("label", { className: "checkbox" }, box, person.name)),
    el("div", { className: "actions" }, save, tickEveryone, status),
  );
}

function checkInLinks() {
  const link = fullUrl("checkin.html", { group: group.id, session: session.number });
  const linkBox = el("input", { type: "text", id: "checkin-link", readOnly: true, value: link });
  const copied = el("span", { className: "muted" });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      copied.textContent = "Copied";
    } catch {
      // Some browsers block copying. Selecting it lets the leader copy by hand.
      linkBox.select();
      copied.textContent = "Couldn't copy. The link is selected, so copy it yourself.";
    }
  }

  return el("section", { className: "card" },
    el("h2", {}, "Check in"),
    el("p", {}, "Kids scan this with their phone's camera."),
    qrCode(link),
    el("label", { htmlFor: "checkin-link" }, "Or send them the link"),
    linkBox,
    el("div", { className: "actions" },
      el("button", { type: "button", className: "secondary", onclick: copy }, "Copy link"),
      copied,
    ),
    el("p", { className: "muted" }, "For kids without a phone:"),
    el("a", {
      className: "button secondary",
      href: urlFor("checkin.html", { group: group.id, session: session.number, shared: 1 }),
    }, "Check in on this device"),
  );
}

// Fills in the Check-ins part from the group as it was last loaded.
function showCheckIns() {
  const refreshButton = el("div", { className: "actions" },
    el("button", { type: "button", className: "secondary", onclick: refresh }, "Refresh"));
  if (!usesNames(group)) {
    const done = countedCheckIns(group, session).length;
    const outOf = session.attendedCount === null || session.attendedCount === undefined ? "" : ` of ${session.attendedCount} who took part`;
    fill(checkIns,
      el("h2", {}, "Check-ins"),
      el("p", {}, el("strong", {}, `${done} checked in${outOf}`)),
      refreshButton,
    );
    return;
  }

  const numbers = sessionNumbers(group, session.number);
  const answered = new Set(session.answers.map((answer) => answer.personId));
  const kids = byName(group.people);
  const waiting = kids.filter((p) => session.present.includes(p.id) && !answered.has(p.id)).map((p) => p.name);
  const notHere = kids.filter((p) => !session.present.includes(p.id) && answered.has(p.id)).map((p) => p.name);

  fill(checkIns,
    el("h2", {}, "Check-ins"),
    el("p", {}, el("strong", {}, `${numbers.answered} of ${numbers.present} checked in`)),
    waiting.length > 0 ? el("p", {}, `Not checked in yet: ${nameList.format(waiting)}`) : null,
    notHere.length > 0
      ? el("p", { className: "warning" },
        `${nameList.format(notHere)} ${notHere.length === 1 ? "has" : "have"} checked in but ${notHere.length === 1 ? "isn't" : "aren't"} marked as here. ` +
        "Their answers won't count unless they're ticked.")
      : null,
    refreshButton,
  );
}

// Only redraws Check-ins, so ticks that haven't been saved yet aren't lost.
async function refresh() {
  try {
    await load();
  } catch (error) {
    showError(error);
    return;
  }
  showCheckIns();
}

// Like replaceChildren, but skips null. The browser's own replaceChildren
// would show a null as the word "null".
function fill(box, ...parts) {
  box.replaceChildren(...parts.filter(Boolean));
}

function backLink() {
  return el("a", { href: urlFor("group.html", { group: group.id }) }, "← Back to the group");
}

// Sorted by name, then id, the same as the check-in screen, so kids are in
// the same order on both.
function byName(people) {
  return [...people].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
