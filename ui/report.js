// The group report for one session or activity: what was asked, how many
// answered out of how many attended, and the results for each kind of
// question, kept apart. Only group-level results are shown, so it looks the
// same whatever the group's privacy setting. Staff record what they'll try
// next here, and can print it or download it as a CSV.
// Open it as report.html?group=GROUP_ID&session=SESSION_NUMBER.
import { loadGroup, updateSession } from "../core/data.js";
import { sessionReport } from "../core/report.js";
import { reportCsv, sessionGexf } from "../core/exports.js";
import { RELATIONS } from "../core/network.js";
import { asks } from "../core/questions.js";
import { CHECK_IN_TIMINGS, CHECK_IN_MODES, optionLabel } from "../core/settings.js";
import {
  el, getParam, urlFor, showError, formatNumber, labelFor, kindTag, answeredWhen, downloadFile, fileName, ACTIVITY_TYPES,
} from "./app.js";
import { drawPicture, pictureKey } from "./picture.js";

const groupId = getParam("group");
const sessionNumber = Number(getParam("session"));
const main = document.querySelector("main");

start();

async function start() {
  if (!groupId || !Number.isInteger(sessionNumber) || sessionNumber < 1) {
    main.replaceChildren(
      el("p", { className: "error" }, "This link is missing the group or the session number. Open the report from a session's screen."),
      el("a", { href: "groups.html" }, "← All groups"),
    );
    return;
  }

  let group;
  try {
    group = await loadGroup(groupId);
  } catch (error) {
    main.replaceChildren(
      el("h1", {}, "Couldn't load this report"),
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
  draw(group, session);
}

function draw(group, session) {
  const report = sessionReport(group, session.number);
  const a = report.activity;
  const title = a.word === "Activity" ? "Activity report" : `Session ${a.number} report`;
  document.title = `${title} · ${group.name} · Connected`;

  main.replaceChildren(...[
    el("a", { className: "no-print", href: urlFor("session.html", { group: group.id, session: session.number }) }, "← Back"),
    el("p", { className: "muted" }, group.name),
    el("h1", {}, title),
    about(report, session),
    participation(report),
    report.sections.map((section) => sectionCard(group, session, report, section)),
    report.network ? null : el("section", { className: "card" },
      el("h2", {}, kindTag("interaction"), "Who connected with whom"),
      el("p", {}, report.noNetworkNote)),
    notesForm(group, session),
    downloads(group, session),
  ].flat().filter(Boolean));
}

// The activity, the date, what was asked and when.
function about(report, session) {
  const a = report.activity;
  return el("section", { className: "card" },
    el("h2", {}, "About this check-in"),
    el("p", {}, [a.date, labelFor(ACTIVITY_TYPES, a.activityType)].filter(Boolean).join(" · ") || "No date or activity type recorded."),
    a.note ? el("p", {}, a.note) : null,
    a.goal ? el("p", {}, el("strong", {}, "Activity goal: "), a.goal) : null,
    el("p", { className: "muted" },
      [answeredWhen(a.answeredFrom, a.answeredTo),
        `check-in ${optionLabel(CHECK_IN_TIMINGS, a.timing).toLowerCase() || "timing not recorded"}`,
        optionLabel(CHECK_IN_MODES, report.group.checkInMode)].join(" · ")),
    el("h3", {}, "What was asked"),
    el("ul", { className: "list" },
      report.sections.flatMap((s) => s.questions).sort((x, y) => a.questionIds.indexOf(x.id) - a.questionIds.indexOf(y.id))
        .map((q) => el("li", {}, kindTag(q.kind), q.wording)),
    ),
    session.questions ? null : el("p", { className: "muted" }, "This session used the original Connected check-in."),
  );
}

function participation(report) {
  const p = report.participation;
  return el("section", { className: "stats" },
    stat(p.attended ?? "not recorded", "Attended"),
    stat(p.checkedIn, "Checked in"),
    stat(p.notCheckedIn ?? "n/a", "Didn't check in"),
  );
}

function sectionCard(group, session, report, section) {
  return el("section", { className: "card" },
    el("h2", {}, kindTag(section.kind), section.label),
    el("p", { className: "muted" }, section.asks),
    section.kind === "interaction" && report.network ? network(group, session, report.network) : null,
    section.questions.map(questionBlock),
  );
}

function network(group, session, net) {
  const n = net.numbers;
  return el("div", {},
    el("p", {}, `Network: ${net.relation}. Everyone marked as here is included.`),
    el("section", { className: "stats" },
      stat(n.links, "Connections"),
      stat(formatNumber(n.density, 2), "Share of possible pairs who connected"),
      stat(formatNumber(n.averageLinks, 1), "Connections per kid, on average"),
      stat(formatNumber(n.centralization, 2), "How much the connections center on one kid (0 to 1)"),
      stat(n.isolates, "Answered, but no reported connections"),
      stat(n.unknown, "Not known: skipped or didn't check in"),
    ),
    // The report is for the whole group, so the picture never has names.
    n.present > 0 ? [drawPicture(group, session.number, { names: false }), pictureKey()] : null,
  );
}

function questionBlock(q) {
  const notes = [
    q.researchTested ? `Research-tested: ${q.source}` : "Not research-tested",
    q.purposeUnclear ? "purpose unclear (not interaction, belonging or learning)" : null,
  ].filter(Boolean).join(" · ");
  const counts = [`${q.answered} answered`, `${q.skipped} skipped`];
  if (q.notRecorded) counts.push(`${q.notRecorded} older check-ins named nobody, and didn't record whether that was "Nobody" or a skip`);
  if (q.notAsked) counts.push(`${q.notAsked} not asked (only asked at a kid's first check-in)`);

  return el("div", { className: "question-result" },
    el("h3", {}, q.wording ?? q.label),
    el("p", { className: "muted" }, `${q.label}. ${notes}.`),
    el("p", {}, counts.join(" · ")),
    result(q),
  );
}

function result(q) {
  if (q.named !== undefined) {
    return bars([
      { label: "Named someone", count: q.named },
      { label: "Said nobody", count: q.none },
      { label: "Skipped", count: q.skipped },
    ]);
  }
  if (q.byWording) {
    if (q.byWording.length === 0) return el("p", { className: "muted" }, "No answers yet.");
    // Answers given to a different wording (or to a question that was
    // cleared) say what they were asked.
    return el("div", {}, q.byWording.map(({ wording, answers }) => [
      wording && wording !== q.wording ? el("p", {}, el("strong", {}, "Asked as: "), wording) : null,
      el("ul", { className: "list learning-answers" }, answers.map((answer) => el("li", {}, answer))),
    ]));
  }
  return el("div", {},
    q.average !== undefined
      ? el("p", {}, el("strong", {}, `Average ${formatNumber(q.average, 2)}`), ` on a ${q.min} to ${q.max} scale (skips left out)`)
      : null,
    q.multiple ? el("p", { className: "muted" }, "Kids could pick more than one.") : null,
    bars(q.counts),
  );
}

function bars(counts) {
  const most = Math.max(1, ...counts.map((c) => c.count));
  return el("ul", { className: "counts" },
    counts.map((c) => el("li", {},
      el("span", {}, c.label),
      el("span", { className: "bar", style: `width: ${(100 * c.count) / most}%` }),
      el("span", {}, String(c.count)),
    )),
  );
}

// What staff decided, saved with the session so it's there next time.
function notesForm(group, session) {
  const tryNext = el("textarea", { id: "try-next", rows: 3, maxLength: 4000, value: session.tryNext ?? "" });
  const howItWent = el("textarea", { id: "how-it-went", rows: 3, maxLength: 4000, value: session.howItWent ?? "" });
  const status = el("span", { className: "muted" },
    session.notesUpdatedAt ? `Last saved ${new Date(session.notesUpdatedAt).toLocaleString()}` : "");
  const save = el("button", { type: "submit" }, "Save notes");

  async function onSubmit(event) {
    event.preventDefault();
    save.disabled = true;
    status.textContent = "Saving...";
    try {
      const changes = { tryNext: tryNext.value.trim() || null, howItWent: howItWent.value.trim() || null };
      await updateSession(session.id, changes);
      Object.assign(session, changes, { notesUpdatedAt: new Date().toISOString() });
      status.textContent = "Saved";
    } catch (error) {
      showError(error);
      status.textContent = "";
    }
    save.disabled = false;
  }

  return el("form", { className: "card", onsubmit: onSubmit },
    el("h2", {}, "Staff notes"),
    el("p", { className: "muted field-hint" },
      "About the group, not individual kids. Please don't write kids' names: these notes are included in the export."),
    el("label", { htmlFor: "try-next" }, "What will we try next?"),
    el("p", { className: "muted field-hint" }, "For example: demonstrate the activity first, then ask for feedback afterwards."),
    tryNext,
    el("label", { htmlFor: "how-it-went" }, "How did it go?"),
    el("p", { className: "muted field-hint" }, "Fill this in after trying it."),
    howItWent,
    el("div", { className: "actions" }, save, status),
  );
}

function downloads(group, session) {
  const base = fileName(group.name, group.groupType === "single_activity" ? "activity" : `session ${session.number}`);
  const relations = ["either", "worked", "talked", ...(asks(session, "knew_before") ? ["knew"] : [])];
  const relation = el("select", { id: "relation" },
    relations.map((value) => el("option", { value }, RELATIONS[value].label)),
  );
  const network = sessionReport(group, session.number).network;
  return el("section", { className: "card no-print" },
    el("h2", {}, "Export"),
    el("p", { className: "muted" }, "Group-level numbers only: no names, no ids and no individual answers."),
    el("div", { className: "actions" },
      el("button", {
        type: "button",
        // Worked out when clicked, so it includes notes saved since the page opened.
        onclick: () => downloadFile(`${base}.csv`, `\uFEFF${reportCsv(sessionReport(group, session.number))}`, "text/csv;charset=utf-8"),
      }, "Download CSV"),
      el("button", { type: "button", className: "secondary", onclick: () => window.print() }, "Print or save as PDF"),
    ),
    network
      ? el("div", {},
        el("label", { htmlFor: "relation" }, "Network file for Gephi (one kind of connection per file)"),
        relation,
        el("div", { className: "actions" },
          el("button", {
            type: "button",
            className: "secondary",
            onclick: () => downloadFile(`${base}-${relation.value}.gexf`, sessionGexf(group, session.number, relation.value), "application/xml"),
          }, "Download GEXF"),
        ),
      )
      : null,
  );
}

function stat(value, label) {
  return el("div", { className: "stat" },
    el("div", { className: "value" }, String(value)),
    el("div", { className: "label" }, label),
  );
}
