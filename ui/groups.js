// The groups screen: every group, and a form to add a new one.
import { listGroups, createGroup } from "../core/data.js";
import { el, showError, urlFor, labelFor, PROGRAM_TYPES } from "./app.js";

const main = document.querySelector("main");

start();

async function start() {
  main.replaceChildren(el("h1", {}, "Groups"), el("p", { className: "muted" }, "Loading..."));
  let groups;
  try {
    groups = await listGroups();
  } catch (error) {
    main.replaceChildren(el("h1", {}, "Groups"));
    showError(error);
    return;
  }

  main.replaceChildren(
    el("h1", {}, "Groups"),
    groups.length === 0
      ? el("p", { className: "muted" }, "No groups yet. Add your first one below.")
      : el("ul", { className: "list" }, groups.map(groupRow)),
    addGroupForm(),
  );
}

function groupRow(group) {
  // Left out when empty, so a group without them has no stray "·".
  const details = [group.age_range, labelFor(PROGRAM_TYPES, group.program_type)].filter(Boolean).join(" · ");
  return el("li", {},
    el("a", { href: urlFor("group.html", { group: group.id }) }, group.name),
    details ? el("div", { className: "muted" }, details) : null,
  );
}

function addGroupForm() {
  const name = el("input", { type: "text", id: "name", required: true });
  const ageRange = el("input", { type: "text", id: "age-range", "aria-describedby": "age-range-hint" });
  const programType = el("select", { id: "program-type" },
    el("option", { value: "" }, "Choose one"),
    PROGRAM_TYPES.map((type) => el("option", { value: type.value }, type.label)),
  );
  const save = el("button", { type: "submit" }, "Save");

  async function onSubmit(event) {
    // Without this, the browser would reload the page instead of saving.
    event.preventDefault();
    // required lets a name of only spaces through, so check the trimmed one.
    const trimmed = name.value.trim();
    if (!trimmed) {
      name.value = "";
      name.reportValidity();
      return;
    }

    // Stops a double click from making two groups.
    save.disabled = true;
    try {
      // The database only accepts the listed program types, so a blank
      // choice is saved as null rather than "".
      const group = await createGroup(trimmed, {
        ageRange: ageRange.value.trim() || null,
        programType: programType.value || null,
      });
      location.href = urlFor("group.html", { group: group.id });
    } catch (error) {
      showError(error);
      save.disabled = false;
    }
  }

  return el("form", { className: "card", onsubmit: onSubmit },
    el("h2", {}, "Add a group"),
    el("label", { htmlFor: "name" }, "Name"),
    name,
    el("label", { htmlFor: "age-range" }, "Age range"),
    el("p", { className: "muted field-hint", id: "age-range-hint" }, "Optional. For example, 11-13."),
    ageRange,
    el("label", { htmlFor: "program-type" }, "Program type"),
    programType,
    el("div", { className: "actions" }, save),
  );
}
