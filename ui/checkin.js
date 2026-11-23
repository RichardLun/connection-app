// The kid check-in screen. Kids open it on their own phones by scanning the
// QR code on the session screen, tap their name, and answer one question at
// a time. Kids without a phone use the leader's device instead. Groups that
// don't collect names skip the name step.
// Open it as checkin.html?group=GROUP_ID&session=SESSION_NUMBER, and add
// &shared=1 for a device that kids pass around.
// The questions, their wording and their answer options come from
// core/questions.js, the same place the reports read them from.
import { loadGroup, saveCheckIn, saveAnonymousCheckIn } from "../core/data.js";
import { sessionQuestions } from "../core/questions.js";
import { usesNames } from "../core/settings.js";
import { getParam, urlFor, el, svgEl } from "./app.js";

const TEXT = {
  pickHint: "Tap everyone who fits. If it was nobody, tap Nobody. You can also skip the question.",
  nobody: "Nobody",
  nobodyElse: "There's nobody else to pick.",
};

const groupId = getParam("group");
const sessionNumber = Number(getParam("session"));
// A shared device gets ready for the next kid after each one, and has a link
// back to the leader's screens. On a kid's own phone, neither makes sense.
const shared = getParam("shared") === "1";
const main = document.querySelector("main");

let group; // everything about the group, from loadGroup
let session; // this session, from group.sessions
let kid; // the kid checking in right now, and their answers so far

start();

// Runs again before each kid, so the name list picks up anyone the leader
// has just marked as here, and anyone who has checked in since.
async function start() {
  kid = null;
  if (!groupId || !Number.isInteger(sessionNumber) || sessionNumber < 1) {
    show(
      el("p", { className: "error" },
        "This link is missing the group or the session number. Open the check-in from the session screen."),
    );
    return;
  }

  show(el("p", { className: "muted big" }, "Loading..."));
  try {
    group = await loadGroup(groupId);
  } catch (error) {
    console.error(error);
    show(
      el("p", { className: "error" }, `Couldn't load the check-in. Check the internet connection. (${error.message})`),
      el("div", { className: "nav" }, el("button", { onclick: start }, "Try again")),
    );
    return;
  }

  session = group.sessions.find((s) => s.number === sessionNumber);
  if (!session) {
    show(el("p", { className: "error" }, `${group.name} doesn't have a session ${sessionNumber}.`));
    return;
  }
  document.title = `Check in · ${group.name}`;
  if (usesNames(group)) showNames();
  else showStart();
}

// Groups without names: one button to begin, and nothing that shows who
// has already checked in.
function showStart() {
  show(
    el("p", { className: "context" }, `${group.name} · ${session.number > 1 ? `Session ${session.number}` : "Check-in"}`),
    el("h1", {}, "Check in"),
    el("p", { className: "big" }, "A few quick questions. Your name isn't asked, and you can skip any question."),
    el("div", { className: "nav" }, el("button", { onclick: () => begin(null) }, "Start")),
    shared ? leaderLink() : null,
  );
}

function showNames() {
  const here = presentKids();
  const done = new Set(session.answers.map((answer) => answer.personId));
  const top = el("p", { className: "context" }, `${group.name} · Session ${session.number}`);

  if (here.length === 0) {
    show(
      top,
      el("h1", {}, "Nobody is marked as here yet"),
      el("p", { className: "big" }, "Ask your leader to mark who's here."),
      el("div", { className: "nav" }, el("button", { className: "secondary", onclick: start }, "Check again")),
      shared ? leaderLink() : null,
    );
    return;
  }

  const notListed = el("div", { hidden: true },
    el("p", { className: "big" }, "Ask your leader to mark you as here, then tap Check again."),
    el("button", { className: "secondary", onclick: start }, "Check again"),
  );

  show(
    top,
    el("h1", {}, "Tap your name"),
    el("div", { className: "choices" },
      here.map((person) => {
        const finished = done.has(person.id);
        return el("button", {
          className: finished ? "choice done" : "choice",
          onclick: () => {
            if (finished && !confirm(`${person.name} has already checked in. Start again? This replaces their earlier answers.`)) return;
            begin(person);
          },
        }, finished ? `${person.name} ✓` : person.name);
      }),
    ),
    el("p", { className: "muted" }, `${here.filter((p) => done.has(p.id)).length} of ${here.length} checked in`),
    el("button", { className: "plain", onclick: () => { notListed.hidden = false; } }, "My name isn't here"),
    notListed,
    shared ? leaderLink() : null,
  );
}

// person is null for a group without names.
function begin(person) {
  // Kids are only asked who they knew before at their very first check-in.
  // Their earlier picks for this session are kept, with how they answered,
  // so checking in again doesn't erase them.
  const checkedInBefore = person !== null && group.sessions.some(
    (s) => s.answers.some((answer) => answer.personId === person.id),
  );
  const earlier = person && session.answers.find((answer) => answer.personId === person.id);
  const knewBefore = person === null ? [] : session.ticks
    .filter((tick) => tick.from === person.id && tick.knewBefore)
    .map((tick) => tick.to);

  kid = {
    person,
    // Made here, so trying again after a failed save updates this check-in
    // instead of adding a second one.
    responseId: person === null ? crypto.randomUUID() : null,
    picks: { worked_with: new Set(), talked_to: new Set(), knew_before: new Set(knewBefore) },
    // "named", "none" (tapped Nobody), "skipped", or null if not asked.
    status: { worked_with: null, talked_to: null, knew_before: earlier?.knewBeforeStatus ?? null },
    answers: { easierNextTime: new Set() },
    steps: sessionQuestions(session).filter((q) => !(q.firstCheckInOnly && checkedInBefore)),
    step: 0,
  };
  showStep();
}

function showStep() {
  const question = kid.steps[kid.step];
  if (question.type === "names") pickPeople(question);
  if (question.type === "circles") pickCircles(question);
  if (question.type === "scale") {
    const choices = question.options.map((option) => ({
      value: option.value,
      label: [el("strong", {}, String(option.value)), ` ${option.label}`],
    }));
    pickOne(question, choices, null);
  }
  if (question.type === "choice") {
    // The yes/no context questions were always saved as "" when skipped.
    pickOne(question, question.options, question.field === "newPartner" ? null : "");
  }
  if (question.type === "choices") pickSeveral(question);
  if (question.type === "text") writeAnswer(question);
}

// The layout every question shares: who's answering, the question, the
// choices, and the buttons along the bottom.
function layout(question, body, button, hint = question.hint) {
  const who = kid.person ? `${kid.person.name} · ` : "";
  show(
    el("p", { className: "context" }, `${who}Question ${kid.step + 1} of ${kid.steps.length}`),
    el("h1", {}, question.wording),
    hint ? el("p", { className: "hint" }, hint) : null,
    body,
    el("div", { className: "nav" }, el("button", { className: "secondary", onclick: back }, "Back"), button),
  );
}

// Tapping a name picks it, and tapping it again un-picks it. Nobody is its
// own answer, so it's different from skipping the question.
function pickPeople(question) {
  const chosen = kid.picks[question.id];
  // Anyone in the group counts for "knew before", even kids who are away today.
  const people = question.firstCheckInOnly
    ? byName(group.people).filter((p) => p.id !== kid.person.id)
    : presentKids().filter((p) => p.id !== kid.person.id);
  if (chosen.size > 0) kid.status[question.id] = "named";

  const nameButtons = people.map((person) => {
    const button = el("button", {
      className: "choice",
      "aria-pressed": String(chosen.has(person.id)),
      onclick: () => {
        if (chosen.has(person.id)) chosen.delete(person.id);
        else chosen.add(person.id);
        button.setAttribute("aria-pressed", String(chosen.has(person.id)));
        kid.status[question.id] = chosen.size > 0 ? "named" : null;
        update();
      },
    }, person.name);
    return button;
  });
  const nobody = el("button", {
    className: "choice nobody",
    onclick: () => {
      const on = kid.status[question.id] !== "none";
      chosen.clear();
      for (const button of nameButtons) button.setAttribute("aria-pressed", "false");
      kid.status[question.id] = on ? "none" : null;
      update();
    },
  }, TEXT.nobody);
  const nextButton = el("button", {
    onclick: () => {
      // Moving on without a name or Nobody is a skip, which stays blank.
      if (kid.status[question.id] === null || kid.status[question.id] === "skipped") kid.status[question.id] = "skipped";
      next();
    },
  });

  function update() {
    nobody.setAttribute("aria-pressed", String(kid.status[question.id] === "none"));
    nextButton.textContent = kid.status[question.id] === "named" || kid.status[question.id] === "none" ? "Next" : "Skip";
  }
  update();

  layout(question,
    [
      people.length === 0
        ? el("p", { className: "big" }, TEXT.nobodyElse)
        : el("div", { className: "choices" }, nameButtons),
      el("div", { className: "choices" }, nobody),
    ],
    nextButton,
    TEXT.pickHint);
}

// Questions with one answer move on as soon as a kid taps, which is quicker
// on a shared device. Skip leaves the answer empty, like a blank on paper.
function pickOne(question, choices, emptyValue, className = "options") {
  const field = question.field;
  const body = el("div", { className },
    choices.map((choice) =>
      el("button", {
        className: "choice",
        "aria-pressed": String(kid.answers[field] === choice.value),
        onclick: () => {
          kid.answers[field] = choice.value;
          next();
        },
      }, choice.label),
    ),
  );
  const skip = el("button", {
    className: "plain",
    onclick: () => {
      kid.answers[field] = emptyValue;
      next();
    },
  }, "Skip");
  layout(question, body, skip);
}

function pickCircles(question) {
  const choices = question.options.map((option) => ({ value: option.value, label: [circles(option.value), option.label] }));
  pickOne(question, choices, null, "circle-options");
}

// At 1 the two circles are apart. Each step moves them closer, so at 7 they
// almost cover each other.
function circles(level) {
  const distance = 44 - 7 * (level - 1);
  return svgEl("svg", { viewBox: "0 0 100 50", "aria-hidden": "true" },
    svgEl("circle", { cx: 50 - distance / 2, cy: 25, r: 20, class: "me" }),
    svgEl("circle", { cx: 50 + distance / 2, cy: 25, r: 20, class: "us" }),
  );
}

// Pick all that fit. A choice like "Nothing needs to change" can only be
// picked on its own.
function pickSeveral(question) {
  const chosen = kid.answers.easierNextTime;
  const buttons = question.options.map((option) => {
    const button = el("button", {
      className: "choice",
      "aria-pressed": String(chosen.has(option.value)),
      onclick: () => {
        if (chosen.has(option.value)) chosen.delete(option.value);
        else {
          for (const other of question.options) if (other.alone || option.alone) chosen.delete(other.value);
          chosen.add(option.value);
        }
        for (const [i, item] of question.options.entries()) buttons[i].setAttribute("aria-pressed", String(chosen.has(item.value)));
        nextButton.textContent = chosen.size > 0 ? "Next" : "Skip";
      },
    }, option.label);
    return button;
  });
  const nextButton = el("button", { onclick: next }, chosen.size > 0 ? "Next" : "Skip");
  layout(question, el("div", { className: "options" }, buttons), nextButton);
}

function writeAnswer(question) {
  const box = el("textarea", { rows: 4, maxLength: 2000, value: kid.answers.learningAnswer ?? "", "aria-label": "Your answer" });
  const nextButton = el("button", {
    onclick: () => {
      kid.answers.learningAnswer = box.value.trim() || null;
      next();
    },
  }, box.value.trim() ? "Next" : "Skip");
  box.oninput = () => { nextButton.textContent = box.value.trim() ? "Next" : "Skip"; };
  layout(question, el("div", { className: "options" }, box), nextButton);
}

function next() {
  kid.step += 1;
  if (kid.step < kid.steps.length) showStep();
  else save();
}

function back() {
  if (kid.step === 0) {
    kid = null;
    if (usesNames(group)) showNames();
    else showStart();
    return;
  }
  kid.step -= 1;
  showStep();
}

async function save() {
  show(el("h1", {}, "Saving..."));
  const answers = {
    q4: kid.answers.q4 ?? null,
    q5: kid.answers.q5 ?? null,
    identification: kid.answers.identification ?? null,
    feltIncluded: kid.answers.feltIncluded ?? null,
    newPartner: kid.answers.newPartner ?? null,
    easierNextTime: [...kid.answers.easierNextTime],
    stayedWhole: kid.answers.stayedWhole ?? "",
    firstTime: kid.answers.firstTime ?? "",
    learningAnswer: kid.answers.learningAnswer ?? null,
  };
  try {
    if (kid.person) {
      await saveCheckIn(session.id, {
        personId: kid.person.id,
        workedWith: [...kid.picks.worked_with],
        talkedTo: [...kid.picks.talked_to],
        knewBefore: [...kid.picks.knew_before],
        workedWithStatus: kid.status.worked_with,
        talkedToStatus: kid.status.talked_to,
        knewBeforeStatus: kid.status.knew_before,
        ...answers,
      });
    } else {
      await saveAnonymousCheckIn(session.id, kid.responseId, answers);
    }
  } catch (error) {
    // The answers are still in kid, so Try again sends them without the
    // kid having to start over.
    console.error(error);
    show(
      el("h1", {}, "That didn't save"),
      el("p", { className: "error" }, `Check the internet connection, then tap Try again. (${error.message})`),
      el("div", { className: "nav" }, el("button", { onclick: save }, "Try again")),
    );
    return;
  }
  thanks();
}

function thanks() {
  const title = kid.person ? `Thanks, ${kid.person.name}!` : "Thanks!";
  kid = null;
  if (!shared) {
    // A friend without a phone might borrow this one, so they can still
    // check in from here.
    show(
      el("h1", {}, title),
      el("p", { className: "big" }, "You're all done. You can put your phone away."),
      el("div", { className: "nav" }, el("button", { className: "plain", onclick: start }, "Check in someone else")),
    );
    return;
  }
  // Goes back to the start by itself, in case a kid walks off without
  // tapping the button.
  const timer = setTimeout(start, 8000);
  show(
    el("h1", {}, title),
    el("p", { className: "big" }, "You're all done. Please pass this to the next person."),
    el("div", { className: "nav" },
      el("button", {
        onclick: () => {
          clearTimeout(timer);
          start();
        },
      }, "Next person"),
    ),
  );
}

// Swaps in a new screen. Taps are ignored for a moment, so a quick double
// tap can't answer the next question by accident.
function show(...nodes) {
  main.replaceChildren(...nodes.flat().filter(Boolean));
  window.scrollTo(0, 0);
  main.style.pointerEvents = "none";
  setTimeout(() => {
    main.style.pointerEvents = "";
  }, 400);
}

function leaderLink() {
  return el("a", {
    className: "leader-link",
    href: urlFor("session.html", { group: groupId, session: sessionNumber }),
  }, "Leader: back to the session screen");
}

function presentKids() {
  return byName(group.people.filter((person) => session.present.includes(person.id)));
}

// Sorted by name, then id, so two kids with the same name always stay in the
// same order.
function byName(people) {
  return [...people].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
