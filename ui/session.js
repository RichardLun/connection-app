// The session screen: who's here, check-in progress, and links to the check-in and results.
// Open it as session.html?group=GROUP_ID&session=SESSION_NUMBER.
import { loadGroup, setPresent } from "../core/data.js";
import { sessionNumbers } from "../core/numbers.js";
import { el, getParam, urlFor, fullUrl, showError, labelFor, ACTIVITY_TYPES } from "./app.js";
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
  document.title = `Session ${session.number} · ${group.name} · Connected`;
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
    el("h1", {}, `Session ${session.number}`),
    details ? el("p", { className: "muted" }, details) : null,
    session.activityNote ? el("p", {}, session.activityNote) : null,
    whosHere(saved),
    checkInLinks(),
    checkIns,
    el("div", { className: "actions" },
      el("a", { className: "button", href: urlFor("results.html", { group: group.id, session: session.number }) }, "See results"),
    ),
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
    el("div", { className: "actions" }, el("button", { type: "button", className: "secondary", onclick: refresh }, "Refresh")),
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
