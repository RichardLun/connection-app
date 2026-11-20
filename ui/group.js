// The group screen: a group's kids and sessions, and starting a new session.
// Open it as group.html?group=GROUP_ID.
import { loadGroup, addPerson, renamePerson, removePerson, startSession } from "../core/data.js";
import { hasData } from "../core/people.js";
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
    list.replaceChildren(...byName(group.people).map(kidRow));
    list.hidden = group.people.length === 0;
    empty.hidden = group.people.length > 0;
  }

  function kidRow(person) {
    const row = el("li", { className: "row" });
    const edit = el("button", { type: "button", className: "secondary" }, "Edit");
    edit.onclick = () => {
      const form = editForm(person);
      row.replaceChildren(form);
      form.querySelector("input").select();
    };
    // Only offered when there's nothing to lose. removePerson checks again,
    // in case the kid checked in after this page loaded.
    const remove = hasData(group, person.id)
      ? null
      : el("button", { type: "button", className: "secondary" }, "Remove");
    if (remove) remove.onclick = () => onRemove(person, remove);

    fill(row, el("span", {}, person.name), edit, remove);
    return row;
  }

  function editForm(person) {
    const input = el("input", { type: "text", value: person.name, required: true, "aria-label": `New name for ${person.name}` });
    const warning = el("p", { className: "warning", hidden: true });
    const save = el("button", { type: "submit" }, "Save");
    const cancel = el("button", { type: "button", className: "secondary", onclick: showKids }, "Cancel");

    async function onSave(event) {
      event.preventDefault();
      warning.hidden = true;
      const trimmed = checkName(input, warning, person.id);
      if (!trimmed) return;
      if (trimmed === person.name) {
        showKids();
        return;
      }

      save.disabled = true;
      try {
        const saved = await renamePerson(person.id, trimmed);
        person.name = saved.name;
        showKids();
      } catch (error) {
        showError(error);
        save.disabled = false;
      }
    }

    return el("form", { className: "edit-kid", onsubmit: onSave },
      input,
      warning,
      el("div", { className: "actions" }, save, cancel),
    );
  }

  async function onRemove(person, button) {
    if (!confirm(`Remove ${person.name}? This can't be undone.`)) return;
    button.disabled = true;
    try {
      await removePerson(person.id);
      group.people = group.people.filter((other) => other.id !== person.id);
      showKids();
    } catch (error) {
      showError(error);
      button.disabled = false;
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    message.hidden = true;
    const trimmed = checkName(name, message);
    if (!trimmed) return;

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

// The same rules for adding and renaming a kid, so the two can't drift
// apart. Gives back the trimmed name, or null after showing what's wrong.
// skipId is the kid being renamed, so "ana" can become "Ana".
function checkName(input, warning, skipId) {
  const trimmed = input.value.trim();
  if (!trimmed) {
    input.value = "";
    input.focus();
    return null;
  }

  // Two kids with the same name would get two identical buttons on the
  // check-in screen.
  const taken = group.people.some((person) =>
    person.id !== skipId && person.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (taken) {
    warning.textContent = `There's already a kid called ${trimmed}. Add a last initial, like "${trimmed} P.".`;
    warning.hidden = false;
    input.focus();
    return null;
  }
  return trimmed;
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
