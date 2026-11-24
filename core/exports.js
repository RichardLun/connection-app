// Files staff can download: the group report as a CSV, and one session's
// network as GEXF for Gephi. Neither ever includes a kid's name or id.
// docs/trials.md and docs/reference-comparison.md explain them.
// This file must not import from lib/ or core/data.js, so Node can test it.
import { buildNetwork, RELATIONS } from "./network.js";
import { showsIndividuals } from "./settings.js";

// The network numbers from sessionNumbers, under the same names.
const NETWORK_MEASURES = ["present", "answered", "links", "density", "isolates", "unknown", "centralization", "averageLinks"];

// One row per number, so it opens cleanly in a spreadsheet and the rows
// can be filtered by section or kind.
export function reportCsv(report) {
  const rows = [["section", "kind", "question_id", "question", "measure", "value"]];
  const add = (section, kind, id, question, measure, value) =>
    rows.push([section, kind, id, question, measure, value ?? ""]);

  const a = report.activity;
  add("activity", "", "", "", "group", report.group.name);
  add("activity", "", "", "", "group_type", report.group.type);
  add("activity", "", "", "", "check_in_mode", report.group.checkInMode);
  add("activity", "", "", "", a.word.toLowerCase(), a.number);
  add("activity", "", "", "", "date", a.date);
  add("activity", "", "", "", "activity_type", a.activityType);
  add("activity", "", "", "", "activity_goal", a.goal);
  add("activity", "", "", "", "check_in_timing", a.timing);
  add("activity", "", "", "", "first_check_in_at", a.answeredFrom);
  add("activity", "", "", "", "last_check_in_at", a.answeredTo);
  add("activity", "", "", "", "questions_asked", a.questionIds.join(" "));
  add("participation", "", "", "", "attended", report.participation.attended);
  add("participation", "", "", "", "checked_in", report.participation.checkedIn);

  for (const section of report.sections) {
    for (const q of section.questions) {
      const row = (measure, value) => add(section.kind, q.kind, q.id, q.wording, measure, value);
      row("asked", q.asked);
      row("answered", q.answered);
      row("skipped", q.skipped);
      if (q.notRecorded) row("not_recorded_older_check_in", q.notRecorded);
      if (q.named !== undefined) {
        row("named_someone", q.named);
        row("said_nobody", q.none);
      }
      if (q.average !== undefined) row(`average_${q.min}_to_${q.max}`, q.average);
      for (const option of q.counts ?? []) row(`chose: ${option.label}`, option.count);
    }
    if (section.kind === "interaction" && report.network) {
      for (const key of NETWORK_MEASURES) {
        add("interaction", "interaction", "network", report.network.relation, key, report.network.numbers[key]);
      }
    }
  }
  if (!report.network) add("interaction", "interaction", "network", "", "note", report.noNetworkNote);
  add("staff_notes", "", "", "", "what_we_will_try_next", report.notes.tryNext);
  add("staff_notes", "", "", "", "how_it_went", report.notes.howItWent);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// Quotes a cell when it needs it. Text starting with = + - @ gets a ' in
// front, so a spreadsheet shows it instead of running it as a formula.
function csvCell(value) {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// One kind of relationship per file, so Gephi never mixes being friends
// before with working together today. Kids are numbered in id order, which
// has nothing to do with their names. Group-only groups leave out each
// kid's status too, since that would flag individual kids.
export function sessionGexf(group, sessionNumber, relation = "either") {
  const network = buildNetwork(group, sessionNumber, { relation });
  const session = group.sessions.find((s) => s.number === sessionNumber);
  const withStatus = showsIndividuals(group);
  const nodeId = new Map(network.people.map((id, i) => [id, `n${i + 1}`]));
  const description =
    `${group.name}, session ${session.number}${session.date ? ` (${session.date})` : ""}. ` +
    `Relation: ${RELATIONS[relation].label}. Undirected. Everyone marked as here is a node, ` +
    "including kids with no links. Names are left out.";

  const nodes = network.people.map((id) => {
    const attrs = withStatus
      ? `<attvalues><attvalue for="status" value="${network.status[id]}"/></attvalues>`
      : "";
    return `      <node id="${nodeId.get(id)}" label="Kid ${nodeId.get(id).slice(1)}">${attrs}</node>`;
  });
  const edges = network.links.map((link, i) =>
    `      <edge id="e${i + 1}" source="${nodeId.get(link.a)}" target="${nodeId.get(link.b)}">` +
    `<attvalues><attvalue for="relation" value="${relation}"/></attvalues></edge>`);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://gexf.net/1.3" version="1.3">',
    `  <meta><creator>Connected</creator><description>${xml(description)}</description></meta>`,
    '  <graph defaultedgetype="undirected" mode="static">',
    withStatus ? '    <attributes class="node"><attribute id="status" title="status" type="string"/></attributes>' : null,
    '    <attributes class="edge"><attribute id="relation" title="relation" type="string"/></attributes>',
    "    <nodes>",
    ...nodes,
    "    </nodes>",
    "    <edges>",
    ...edges,
    "    </edges>",
    "  </graph>",
    "</gexf>",
    "",
  ].filter((line) => line !== null).join("\n");
}

function xml(text) {
  return String(text).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
}
