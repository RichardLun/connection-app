// The group screen: a group's kids and sessions, and starting a new session.
// Open it as group.html?group=GROUP_ID.
import { loadGroup, addPerson, startSession } from "../core/data.js";
import { el, getParam, urlFor, showError, today, labelFor, PROGRAM_TYPES, ACTIVITY_TYPES } from "./app.js";

const groupId = getParam("group");
const main = document.querySelector("main");
const backLink = () => el("a", { href: "groups.html" }, "← All groups");

let group; // everything about the group, from loadGroup

start();

async function start() {
  if (!groupId) {
    main.replaceChildren(
      el("p", { className: "error" }, "This link is missing the group. Open a group from the groups screen."),
      backLink(),
    );
    return;
  }

  main.replaceChildren(el("p", { className: "muted" }, "Loading..."));
  try {
    group = await loadGroup(groupId);
  } catch (error) {
    main.replaceChildren(
      el("h1", {}, "Couldn't load this group"),
      el("p", {}, "The link might be wrong, or the internet might be down."),
      backLink(),
    );
    showError(error);
    return;
  }

  document.title = `${group.name} · Connected`;
  // Left out when empty, so a group without them has no stray "·".
  const details = [group.ageRange, labelFor(PROGRAM_TYPES, group.programType)].filter(Boolean).join(" · ");

  fill(main,
    backLink(),
    el("h1", {}, group.name),
    details ? el("p", { className: "muted" }, details) : null,
    startSessionForm(),
    sessionsSection(),
    kidsSection(),
  );
}

function startSessionForm() {
  const date = el("input", { type: "date", id: "date", value: today() });
  const activity = el("select", { id: "activity" },
    el("option", { value: "" }, "Choose one"),
    ACTIVITY_TYPES.map((type) => el("option", { value: type.value }, type.label)),
  );
  const note = el("input", { type: "text", id: "note", "aria-describedby": "note-hint" });
  const button = el("button", { type: "submit" }, "Start session");

  async function onSubmit(event) {
    // Without this, the browser would reload the page instead of saving.
    event.preventDefault();
    // Stops a double click from starting two sessions.
    button.disabled = true;
    try {
      // The database only accepts the listed activity types, so blanks are
      // saved as null rather than "".
      const session = await startSession(group.id, {
        date: date.value || null,
        activityType: activity.value || null,
        activityNote: note.value.trim() || null,
      });
      location.href = urlFor("session.html", { group: group.id, session: session.number });
    } catch (error) {
      showError(error);
      button.disabled = false;
    }
  }

  return el("form", { className: "card", onsubmit: onSubmit },
    el("h2", {}, "Start a session"),
    el("label", { htmlFor: "date" }, "Date"),
    date,
    el("label", { htmlFor: "activity" }, "Activity"),
    activity,
    el("label", { htmlFor: "note" }, "Note"),
    el("p", { className: "muted field-hint", id: "note-hint" }, "Optional."),
    note,
    el("div", { className: "actions" }, button),
  );
}

function sessionsSection() {
  const newestFirst = [...group.sessions].reverse();
  return el("section", {},
    el("h2", {}, "Sessions"),
    newestFirst.length === 0
      ? el("p", { className: "muted" }, "No sessions yet.")
      : el("ul", { className: "list" }, newestFirst.map(sessionRow)),
    group.sessions.length >= 2
      ? el("div", { className: "actions" },
        el("a", { className: "button secondary", href: urlFor("compare.html", { group: group.id }) }, "Compare sessions"))
      : null,
  );
}

function sessionRow(session) {
  const text = [`Session ${session.number}`, session.date, labelFor(ACTIVITY_TYPES, session.activityType)]
    .filter(Boolean)
    .join(" · ");
  return el("li", {},
    el("a", { href: urlFor("session.html", { group: group.id, session: session.number }) }, text),
  );
}

function kidsSection() {
  const list = el("ul", { className: "list" });
  const empty = el("p", { className: "muted" }, "No kids yet. Add them below.");
  const message = el("p", { className: "warning", hidden: true });
  const name = el("input", { type: "text", id: "kid-name", required: true });
  const button = el("button", { type: "submit" }, "Add");

  // Only the list is redrawn after adding a kid, so the cursor stays in the
  // box for the next name.
  function showKids() {
    list.replaceChildren(...byName(group.people).map((person) => el("li", {}, person.name)));
    list.hidden = group.people.length === 0;
    empty.hidden = group.people.length > 0;
  }

  async function onSubmit(event) {
    event.preventDefault();
    message.hidden = true;
    const trimmed = name.value.trim();
    if (!trimmed) {
      name.value = "";
      name.focus();
      return;
    }

    // Two kids with the same name would get two identical buttons on the
    // check-in screen.
    const taken = group.people.some((person) => person.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (taken) {
      message.textContent = `There's already a kid called ${trimmed}. Add a last initial, like "${trimmed} P.".`;
      message.hidden = false;
      name.focus();
      return;
    }

    // Stops pressing Enter twice from adding the same kid twice.
    button.disabled = true;
    try {
      const person = await addPerson(group.id, trimmed);
      group.people.push({ id: person.id, name: person.name });
      showKids();
      name.value = "";
    } catch (error) {
      showError(error);
    }
    button.disabled = false;
    name.focus();
  }

  showKids();
  return el("section", {},
    el("h2", {}, "Kids"),
    empty,
    list,
    el("form", { className: "card", onsubmit: onSubmit },
      el("label", { htmlFor: "kid-name" }, "Add a kid"),
      name,
      message,
      el("div", { className: "actions" }, button),
    ),
  );
}

// Like replaceChildren, but skips null. The browser's own replaceChildren
// would show a null as the word "null".
function fill(box, ...parts) {
  box.replaceChildren(...parts.filter(Boolean));
}

// Sorted by name, then id, the same as the check-in screen, so kids are in
// the same order on both.
function byName(people) {
  return [...people].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
