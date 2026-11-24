import test from "node:test";
import assert from "node:assert/strict";
import { buildNetwork } from "../core/network.js";
import { sessionNumbers } from "../core/numbers.js";
import { compareSessions } from "../core/compare.js";
import { peopleToCheckOn } from "../core/insights.js";
import { sessionReport } from "../core/report.js";
import { reportCsv, sessionGexf } from "../core/exports.js";
import { sessionOverviewData, comparisonOverviewData } from "../core/overview.js";
import { knownAnswerGroup, anonymousActivity } from "./fixtures/known-answer.js";

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);
}

test("known answer: the network numbers worked out by hand", () => {
  const numbers = sessionNumbers(knownAnswerGroup(), 1);
  assert.equal(numbers.present, 6);
  assert.equal(numbers.answered, 5);
  assert.equal(numbers.links, 2);
  assertClose(numbers.density, 2 / 15);
  assertClose(numbers.centralization, 0.4);
  assertClose(numbers.averageLinks, 2 / 3);
  assert.equal(numbers.isolates, 1);
  assert.equal(numbers.unknown, 2);
  assertClose(numbers.q4Average, 4.25);
  assert.equal(numbers.q4Count, 4);
  assertClose(numbers.identificationAverage, 6);
  assert.equal(numbers.identificationCount, 2);
});

test("skipping a who-question is unknown, saying Nobody is no connections", () => {
  const { status } = buildNetwork(knownAnswerGroup(), 1);
  assert.deepEqual(status, {
    k1: "connected", k2: "connected", k3: "connected", k4: "isolate", k5: "unknown", k6: "unknown",
  });
});

test("one relation at a time uses only that question's answers", () => {
  const group = knownAnswerGroup();
  const worked = buildNetwork(group, 1, { relation: "worked" });
  assert.deepEqual(worked.links.map((l) => [l.a, l.b]), [["k1", "k2"]]);
  assert.equal(worked.status.k3, "unknown");
  assert.equal(worked.status.k5, "unknown");
  const talked = buildNetwork(group, 1, { relation: "talked" });
  assert.equal(talked.links.length, 2);
  // Eve skipped "worked with" but said Nobody to "talked to".
  assert.equal(talked.status.k5, "isolate");
  assert.throws(() => buildNetwork(group, 1, { relation: "friends" }));
});

test("older check-ins without Nobody/Skip keep the paper rule", () => {
  const group = knownAnswerGroup();
  for (const answer of group.sessions[0].answers) {
    answer.workedWithStatus = null;
    answer.talkedToStatus = null;
  }
  // Eve answered a rating, so on paper she handed in a sheet.
  assert.equal(buildNetwork(group, 1).status.k5, "isolate");
  assert.equal(buildNetwork(group, 1, { relation: "knew" }).status.k5, "unknown");
});

test("the report keeps kinds apart and counts answered and skipped", () => {
  const report = sessionReport(knownAnswerGroup(), 1);
  assert.deepEqual(report.sections.map((s) => s.kind), ["belonging", "interaction", "learning", "feedback"]);
  assert.deepEqual(report.participation, { attended: 6, checkedIn: 5, notCheckedIn: 1 });
  assert.equal(report.activity.answeredFrom, "2026-11-02T16:01:00Z");
  assert.equal(report.activity.answeredTo, "2026-11-02T16:05:00Z");
  const q = Object.fromEntries(report.sections.flatMap((s) => s.questions).map((r) => [r.id, r]));
  assert.deepEqual(
    [q.worked_with.named, q.worked_with.none, q.worked_with.skipped, q.worked_with.answered],
    [1, 2, 2, 3],
  );
  assert.deepEqual([q.talked_to.named, q.talked_to.none, q.talked_to.skipped], [1, 3, 1]);
  assert.deepEqual([q.iis_circles.answered, q.iis_circles.skipped], [4, 1]);
  assertClose(q.iis_circles.average, 4.25);
  assert.deepEqual([q.identification.answered, q.identification.skipped], [2, 3]);
  assert.deepEqual([q.learning.answered, q.learning.skipped], [2, 3]);
  assert.deepEqual(q.learning.byWording.map((w) => w.answers), [["Explain the activity", "Invite them to join without pressure"]]);
  const easier = Object.fromEntries(q.easier_next_time.counts.map((c) => [c.value, c.count]));
  assert.deepEqual(easier, { smaller_groups: 0, clearer_instructions: 1, more_time: 2, another_way: 0, nothing: 1 });
  assert.deepEqual([q.easier_next_time.answered, q.easier_next_time.skipped], [3, 2]);
  assert.equal(report.network.numbers.links, 2);
  // Nothing adds kinds together into one score.
  assert.ok(!JSON.stringify(report).toLowerCase().includes("score"));
});

test("learning answers stay under the wording they were given, even after the question is cleared", () => {
  const group = knownAnswerGroup();
  const session = group.sessions[0];
  const wording = session.learningQuestion;
  // k1 answered an earlier wording; k4 the current one.
  session.learningAnswers[0].question = "Old wording";
  session.learningAnswers[1].question = wording;
  const learning = () => sessionReport(group, 1).sections.flatMap((s) => s.questions).find((q) => q.id === "learning");
  assert.deepEqual(learning().byWording, [
    { wording, answers: ["Explain the activity"] },
    { wording: "Old wording", answers: ["Invite them to join without pressure"] },
  ]);

  session.learningQuestion = null;
  const cleared = learning();
  assert.equal(cleared.wording, null);
  assert.equal(cleared.answered, 2);
  assert.deepEqual(cleared.byWording.map((w) => w.wording), [wording, "Old wording"]);
});

test("a survey without names reports only what was collected", () => {
  const report = sessionReport(anonymousActivity(), 1);
  assert.equal(report.activity.word, "Activity");
  assert.deepEqual(report.participation, { attended: 10, checkedIn: 3, notCheckedIn: 7 });
  assert.equal(report.network, null);
  assert.match(report.noNetworkNote, /can't show who is connected to whom/);
  assert.deepEqual(report.sections.map((s) => s.kind), ["belonging", "interaction", "feedback"]);
  const included = report.sections[0].questions[0];
  assert.deepEqual([included.answered, included.skipped], [2, 1]);
  assertClose(included.average, 4.5);
});

test("comparisons show who answered, both averages, and what changed", () => {
  const c = compareSessions(knownAnswerGroup(), 1, 2);
  assert.deepEqual(c.respondents, {
    before: { attended: 6, checkedIn: 5 },
    after: { attended: 5, checkedIn: 3 },
    checkedInBoth: 3, onlyBefore: 2, onlyAfter: 0, same: false,
  });
  const circles = c.ratings.find((r) => r.id === "iis_circles");
  assertClose(circles.everyone.before, 4.25);
  assertClose(circles.everyone.after, 5);
  assert.deepEqual(circles.paired, { before: 5.5, after: 6, change: 0.5, count: 2 });
  const identification = c.ratings.find((r) => r.id === "identification");
  assertClose(identification.everyone.before, 6);
  assertClose(identification.everyone.after, 5);
  assert.deepEqual(identification.paired, { before: 5, after: 6, change: 1, count: 1 });
  assert.deepEqual(c.questions, { same: false, onlyBefore: ["new_partner", "easier_next_time"], onlyAfter: [] });
  assert.deepEqual(c.timing, { before: "end_of_session", after: "right_after_activity", same: false });
  assert.deepEqual([c.newLinks, c.lostLinks, c.stillIsolated], [0, 1, 0]);
});

test("anonymous answers can't be paired", () => {
  const group = anonymousActivity();
  group.sessions.push({ ...structuredClone(group.sessions[0]), id: "as2", number: 2, attendedCount: null });
  const c = compareSessions(group, 1, 2);
  assert.equal(c.hasNetwork, false);
  assert.equal(c.respondents.checkedInBoth, null);
  assert.equal(c.respondents.after.attended, null);
  assert.equal(c.ratings.find((r) => r.id === "felt_included").paired, null);
  assert.equal(c.newLinks, null);
});

test("group-only groups never single out a kid", () => {
  const group = knownAnswerGroup();
  assert.equal(peopleToCheckOn(group, 1).length, 3);
  group.reportPrivacy = "group_only";
  assert.deepEqual(peopleToCheckOn(group, 1), []);
  assert.equal(sessionOverviewData(group, 1).privacy, "group_only");
  assert.equal(comparisonOverviewData(group, 1, 2).privacy, "group_only");
  assert.ok(!sessionGexf(group, 1).includes("status"));
});

test("the CSV has group-level numbers only, and can't run formulas", () => {
  const group = knownAnswerGroup();
  const csv = reportCsv(sessionReport(group, 1));
  for (const person of group.people) {
    assert.ok(!csv.includes(person.name), `must not include ${person.name}`);
    assert.ok(!csv.includes(`${person.id},`), `must not include ${person.id}`);
  }
  assert.ok(!csv.includes("Invite them"), "learning answer text stays on the report screen");
  assert.match(csv, /\r\nparticipation,,,,attended,6\r\n/);
  assert.match(csv, /,'=Demonstrate the activity first\r\n/);
  assert.match(csv, /belonging,belonging,iis_circles,.*,average_1_to_7,4\.25\r\n/);
  assert.match(csv, /interaction,interaction,worked_with,.*,skipped,2\r\n/);
});

test("GEXF keeps everyone, leaves out names and labels the relation", () => {
  const group = knownAnswerGroup();
  const gexf = sessionGexf(group, 1, "talked");
  assert.equal(gexf.match(/<node /g).length, 6);
  assert.equal(gexf.match(/<edge /g).length, 2);
  assert.match(gexf, /Relation: Talked to/);
  assert.match(gexf, /value="isolate"/);
  assert.deepEqual(gexf.match(/label="[^"]*"/g), [1, 2, 3, 4, 5, 6].map((n) => `label="Kid ${n}"`));
  for (const person of group.people) assert.ok(!gexf.includes(`"${person.id}"`));
});
