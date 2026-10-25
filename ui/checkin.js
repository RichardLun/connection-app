// The kid check-in screen. Kids open it on their own phones by scanning the
// QR code on the session screen, tap their name, and answer one question at
// a time. Kids without a phone use the leader's device instead.
// Open it as checkin.html?group=GROUP_ID&session=SESSION_NUMBER, and add
// &shared=1 for a device that kids pass around.
import { loadGroup, saveCheckIn } from "../core/data.js";
import { getParam, urlFor, el, svgEl } from "./app.js";

// What kids read. Keep it the same as the paper sheet, so an answer means
// the same thing whichever way a kid checked in.
const TEXT = {
  worked: "Who did you work with today?",
  talked: "Who did you talk to today?",
  knew: "Who did you already know before you joined this group?",
  pickHint: "Tap everyone who fits. It's fine to pick nobody.",
  q4: "Which picture best shows how close you feel to this group?",
  q4Hint: "The blue circle is you. The orange circle is the group.",
  q5: "How much do you feel you belong in this group?",
  q5Choices: ["Not at all", "A little", "Somewhat", "Quite a bit", "Very much"],
  stayed: "Did you stay for the whole session?",
  first: "Was today your first time at this group?",
};

const YES_NO = [
  { value: "Y", label: "Yes" },
  { value: "N", label: "No" },
];

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
  showNames();
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
          onclick: () => begin(person, finished),
        }, finished ? `${person.name} ✓` : person.name);
      }),
    ),
    el("p", { className: "muted" }, `${here.filter((p) => done.has(p.id)).length} of ${here.length} checked in`),
    el("button", { className: "plain", onclick: () => { notListed.hidden = false; } }, "My name isn't here"),
    notListed,
    shared ? leaderLink() : null,
  );
}

function begin(person, finished) {
  if (finished && !confirm(`${person.name} has already checked in. Start again? This replaces their earlier answers.`)) {
    return;
  }

  // Kids are only asked who they knew before at their very first check-in.
  // Their earlier picks for this session are kept, so checking in again
  // doesn't erase them.
  const checkedInBefore = group.sessions.some(
    (s) => s.answers.some((answer) => answer.personId === person.id),
  );
  const knewBefore = session.ticks
    .filter((tick) => tick.from === person.id && tick.knewBefore)
    .map((tick) => tick.to);

  kid = {
    person,
    workedWith: new Set(),
    talkedTo: new Set(),
    knewBefore: new Set(knewBefore),
    q4: null,
    q5: null,
    stayedWhole: "",
    firstTime: "",
    steps: ["worked", "talked", ...(checkedInBefore ? [] : ["knew"]), "q4", "q5", "stayed", "first"],
    step: 0,
  };
  showStep();
}

function showStep() {
  const others = presentKids().filter((p) => p.id !== kid.person.id);
  // Anyone in the group counts for "knew before", even kids who are away today.
  const everyoneElse = byName(group.people).filter((p) => p.id !== kid.person.id);
  const q5Choices = TEXT.q5Choices.map((label, i) => ({
    value: i + 1,
    label: [el("strong", {}, String(i + 1)), ` ${label}`],
  }));

  const step = kid.steps[kid.step];
  if (step === "worked") pickPeople(TEXT.worked, others, kid.workedWith);
  if (step === "talked") pickPeople(TEXT.talked, others, kid.talkedTo);
  if (step === "knew") pickPeople(TEXT.knew, everyoneElse, kid.knewBefore);
  if (step === "q4") pickCircles();
  if (step === "q5") pickOne(TEXT.q5, q5Choices, "q5", null);
  if (step === "stayed") pickOne(TEXT.stayed, YES_NO, "stayedWhole", "");
  if (step === "first") pickOne(TEXT.first, YES_NO, "firstTime", "");
}

// The layout every question shares: who's answering, the question, the
// choices, and the buttons along the bottom.
function question(title, hint, body, button) {
  show(
    el("p", { className: "context" }, `${kid.person.name} · Question ${kid.step + 1} of ${kid.steps.length}`),
    el("h1", {}, title),
    hint ? el("p", { className: "hint" }, hint) : null,
    body,
    el("div", { className: "nav" }, el("button", { className: "secondary", onclick: back }, "Back"), button),
  );
}

// Tapping a name picks it, and tapping it again un-picks it.
function pickPeople(title, people, chosen) {
  const body = people.length === 0
    ? el("p", { className: "big" }, "There's nobody else to pick.")
    : el("div", { className: "choices" },
      people.map((person) => {
        const button = el("button", {
          className: "choice",
          "aria-pressed": String(chosen.has(person.id)),
          onclick: () => {
            if (chosen.has(person.id)) chosen.delete(person.id);
            else chosen.add(person.id);
            button.setAttribute("aria-pressed", String(chosen.has(person.id)));
          },
        }, person.name);
        return button;
      }),
    );
  question(title, TEXT.pickHint, body, el("button", { onclick: next }, "Next"));
}

// Questions with one answer move on as soon as a kid taps, which is quicker
// on a shared device. Skip leaves the answer empty, like a blank on paper.
function pickOne(title, choices, field, emptyValue, hint = null, layout = "options") {
  const body = el("div", { className: layout },
    choices.map((choice) =>
      el("button", {
        className: "choice",
        "aria-pressed": String(kid[field] === choice.value),
        onclick: () => {
          kid[field] = choice.value;
          next();
        },
      }, choice.label),
    ),
  );
  const skip = el("button", {
    className: "plain",
    onclick: () => {
      kid[field] = emptyValue;
      next();
    },
  }, "Skip");
  question(title, hint, body, skip);
}

function pickCircles() {
  const choices = [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: [circles(value), String(value)] }));
  pickOne(TEXT.q4, choices, "q4", null, TEXT.q4Hint, "circle-options");
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

function next() {
  kid.step += 1;
  if (kid.step < kid.steps.length) showStep();
  else save();
}

function back() {
  if (kid.step === 0) {
    kid = null;
    showNames();
    return;
  }
  kid.step -= 1;
  showStep();
}

async function save() {
  show(el("h1", {}, "Saving..."));
  try {
    await saveCheckIn(session.id, {
      personId: kid.person.id,
      workedWith: [...kid.workedWith],
      talkedTo: [...kid.talkedTo],
      knewBefore: [...kid.knewBefore],
      q4: kid.q4,
      q5: kid.q5,
      stayedWhole: kid.stayedWhole,
      firstTime: kid.firstTime,
    });
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
  const name = kid.person.name;
  kid = null;
  if (!shared) {
    // A friend without a phone might borrow this one, so they can still
    // check in from here.
    show(
      el("h1", {}, `Thanks, ${name}!`),
      el("p", { className: "big" }, "You're all done. You can put your phone away."),
      el("div", { className: "nav" }, el("button", { className: "plain", onclick: start }, "Check in someone else")),
    );
    return;
  }
  // Goes back to the name list by itself, in case a kid walks off without
  // tapping the button.
  const timer = setTimeout(start, 8000);
  show(
    el("h1", {}, `Thanks, ${name}!`),
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
  main.replaceChildren(...nodes.filter(Boolean));
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
