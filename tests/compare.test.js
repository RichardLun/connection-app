import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newLinkPairs, compareSessions, warningSentence } from "../core/compare.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

const group = JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));

// Computers store decimals slightly imprecisely, so decimals are checked
// to be very close rather than exactly equal.
function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ${expected}, got ${actual}`);
}

test("fake site: the new link pairs", () => {
  assert.deepEqual(newLinkPairs(group, 1, 2), [
    ["S02", "S04"],
    ["S03", "S06"],
    ["S05", "S07"],
    ["S08", "S10"],
    ["S09", "S11"],
  ]);
});

test("fake site: comparing session 1 and session 2", () => {
  const comparison = compareSessions(group, 1, 2);
  assert.equal(comparison.bothPresent, 16);
  assert.equal(comparison.newLinks, 5);
  assert.equal(comparison.lostLinks, 0);
  assert.equal(comparison.stillIsolated, 2);
  assertClose(comparison.q4.before, 4);
  assertClose(comparison.q4.after, 5);
  assertClose(comparison.q4.change, 1);
  assert.equal(comparison.q4.count, 14);
  assertClose(comparison.q5.before, 3);
  assertClose(comparison.q5.after, 4);
  assertClose(comparison.q5.change, 1);
  assert.equal(comparison.q5.count, 14);
  assert.equal(
    comparison.warning,
    "Average Q4 rose by 1.00 and average Q5 rose by 1.00, but 2 people were isolated in both sessions.",
  );
});

test("with no sessions given, the first and last are compared", () => {
  assert.deepEqual(compareSessions(group), compareSessions(group, 1, 2));
});

test("nobody answering both times gives null ratings and no warning", () => {
  // The tiny example compared with itself, after everyone's answers are removed.
  const tiny = tinyGroup();
  tiny.sessions[0].answers = [];
  const comparison = compareSessions(tiny, 1, 1);
  assert.deepEqual(comparison.q4, { before: null, after: null, change: null, count: 0 });
  assert.equal(comparison.warning, null);
});

// Only the parts of a comparison that the warning reads.
function comparison(q4Change, q5Change, stillIsolated, newLinks) {
  return { stillIsolated, newLinks, q4: { change: q4Change }, q5: { change: q5Change } };
}

test("warning table: Q4 rose while kids stayed isolated", () => {
  assert.equal(
    warningSentence(comparison(0.6, 0, 2, 0)),
    "Average Q4 rose by 0.60, but 2 people were isolated in both sessions.",
  );
});

test("warning table: Q5 fell while a new connection formed", () => {
  assert.equal(
    warningSentence(comparison(0, -0.4, 0, 1)),
    "Average Q5 fell by 0.40, but 1 new connection formed.",
  );
});

test("warning table: one rose and one fell", () => {
  assert.equal(
    warningSentence(comparison(0.5, -0.25, 1, 3)),
    "Average Q4 rose by 0.50, but 1 person was isolated in both sessions; " +
      "average Q5 fell by 0.25, but 3 new connections formed.",
  );
});

test("warning table: both rose and nobody stayed isolated", () => {
  assert.equal(warningSentence(comparison(0.6, 0.6, 0, 4)), null);
});

test("warning table: both fell and no new connections formed", () => {
  assert.equal(warningSentence(comparison(-0.6, -0.1, 3, 0)), null);
});

test("warning table: a change that rounds to 0.00 doesn't count", () => {
  assert.equal(warningSentence(comparison(0.004, 0, 2, 2)), null);
});
