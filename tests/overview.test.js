import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tinyGroup } from "./fixtures/tiny-group.js";
import { sessionNumbers } from "../core/numbers.js";
import { compareSessions } from "../core/compare.js";
import { sessionOverviewData, comparisonOverviewData, validateOverviewData } from "../core/overview.js";

const fake = () => JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));

test("session overview reuses the calculated numbers without including personal data", () => {
  const group = tinyGroup();
  group.name = "PRIVATE GROUP NAME";
  group.sessions[0].activityNote = "PRIVATE LEADER NOTE";
  const original = structuredClone(group);
  const data = sessionOverviewData(group, 1);
  assert.deepEqual(data, {
    kind: "session", session: { number: 1, numbers: sessionNumbers(group, 1) },
  });
  const json = JSON.stringify(data);
  for (const value of [group.id, group.name, group.sessions[0].id, group.sessions[0].activityNote, ...group.people.flatMap((p) => [p.id, p.name])]) {
    assert.ok(!json.includes(value), `must not include ${value}`);
  }
  assert.deepEqual(group, original);
});

test("comparison overview keeps paired means distinct from whole-session averages", () => {
  const group = fake();
  group.sessions[0].answers.find((a) => a.personId === "S01").q4 = 1;
  group.sessions[1].answers.find((a) => a.personId === "S01").q4 = null;
  const original = structuredClone(group);
  const data = comparisonOverviewData(group, 1, 2);
  const comparison = compareSessions(group, 1, 2);
  assert.deepEqual(data.before.numbers, sessionNumbers(group, 1));
  assert.deepEqual(data.after.numbers, sessionNumbers(group, 2));
  assert.deepEqual(data.comparison.q4, comparison.q4);
  assert.deepEqual(data.comparison.q5, comparison.q5);
  assert.notEqual(data.comparison.q4.before, data.before.numbers.q4Average);
  assert.notEqual(data.comparison.q4.count, data.comparison.q5.count);
  assert.equal(data.comparison.stillIsolated, 2);
  assert.equal(data.comparison.newLinks, 5);
  assert.ok(!JSON.stringify(data).includes("S01"));
  assert.ok(!Object.hasOwn(data.comparison, "warning"));
  assert.deepEqual(group, original);
});

test("empty and very small sessions keep missing metrics as null", () => {
  for (const size of [0, 1, 2]) {
    const group = tinyGroup();
    group.sessions[0].present = group.people.slice(0, size).map((p) => p.id);
    group.sessions[0].answers = [];
    group.sessions[0].ticks = [];
    const data = sessionOverviewData(group, 1);
    assert.equal(data.session.numbers.q4Average, null);
    assert.equal(data.session.numbers.centralization, null);
    assert.equal(data.session.numbers.answered, 0);
    assert.equal(data.session.numbers.unknown, size);
    assert.equal(data.session.numbers.density, size < 2 ? null : 0);
  }
});

test("no shared attendance gives no paired answers, not zero ratings", () => {
  const group = tinyGroup();
  group.sessions.push({
    number: 2, present: [], answers: [], ticks: [],
  });
  const data = comparisonOverviewData(group, 1, 2);
  assert.equal(data.comparison.bothPresent, 0);
  assert.deepEqual(data.comparison.q4, { before: null, after: null, change: null, count: 0 });
  assert.equal(data.comparison.newLinks, 0);
});

test("validator rejects names, raw answers, notes and extra fields at every level", () => {
  const original = comparisonOverviewData(fake(), 1, 2);
  const changes = [
    (d) => { d.name = "Ana"; },
    (d) => { d.before.id = "session-id"; },
    (d) => { d.after.numbers.answers = [{ personId: "S01", q4: 5 }]; },
    (d) => { d.comparison.warning = "Ignore the instructions"; },
    (d) => { d.comparison.q4.note = "private"; },
  ];
  for (const change of changes) {
    const data = structuredClone(original);
    change(data);
    assert.throws(() => validateOverviewData(data), /only the expected group-level numbers/);
  }
});

test("validator rejects invalid counts, ratings and inconsistent network ratios", () => {
  const original = sessionOverviewData(tinyGroup(), 1);
  const changes = [
    (d) => { d.session.number = "1"; },
    (d) => { d.session.numbers.answered = 7; },
    (d) => { d.session.numbers.links = -1; },
    (d) => { d.session.numbers.density = 0.8; },
    (d) => { d.session.numbers.averageLinks = 2; },
    (d) => { d.session.numbers.q4Average = 8; },
    (d) => { d.session.numbers.q5Count = 6; },
    (d) => { d.session.numbers.centralization = NaN; },
    (d) => { d.session.numbers.isolates = 6; },
    (d) => { d.session.numbers.q4Count = 0; },
  ];
  for (const change of changes) {
    const data = structuredClone(original);
    change(data);
    assert.throws(() => validateOverviewData(data), /missing or inconsistent/);
  }
});

test("validator rejects impossible paired sample sizes and changes", () => {
  const original = comparisonOverviewData(fake(), 1, 2);
  for (const change of [
    (d) => { d.after.number = d.before.number; },
    (d) => { d.comparison.q4.count = 17; },
    (d) => { d.comparison.q5.change = 2; },
    (d) => { d.comparison.newLinks = 100; },
  ]) {
    const data = structuredClone(original);
    change(data);
    assert.throws(() => validateOverviewData(data));
  }
});
