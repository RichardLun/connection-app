// The before-and-after view of two sessions. The rules are in Step 8 of
// docs/build-steps.md.
// This file must not import from lib/ or core/data.js, so Node can test it.
import { buildNetwork } from "./network.js";

export function newLinkPairs(group, a, b) {
  const before = buildNetwork(group, a);
  const after = buildNetwork(group, b);
  return pairsOnlyIn(after, before, presentAtBoth(before, after));
}

// The defaults use group, so they're worked out each time from the group
// being compared.
export function compareSessions(group, a = firstSession(group), b = lastSession(group)) {
  const before = buildNetwork(group, a);
  const after = buildNetwork(group, b);
  const both = presentAtBoth(before, after);
  const sessionA = group.sessions.find((s) => s.number === a);
  const sessionB = group.sessions.find((s) => s.number === b);

  const comparison = {
    bothPresent: both.length,
    newLinks: pairsOnlyIn(after, before, both).length,
    lostLinks: pairsOnlyIn(before, after, both).length,
    stillIsolated: both.filter(
      (id) => before.status[id] === "isolate" && after.status[id] === "isolate",
    ).length,
    q4: ratingChange(sessionA, sessionB, both, "q4"),
    q5: ratingChange(sessionA, sessionB, both, "q5"),
  };
  comparison.warning = warningSentence(comparison);
  return comparison;
}

export function warningSentence(comparison) {
  const rose = [];
  const fell = [];
  for (const question of ["q4", "q5"]) {
    const change = comparison[question].change;
    // Checking the rounded text, so a change only counts if a leader would
    // see it as something other than 0.00.
    if (change === null || Math.abs(change).toFixed(2) === "0.00") continue;
    const name = question.toUpperCase();
    if (change > 0) rose.push(`average ${name} rose by ${change.toFixed(2)}`);
    else fell.push(`average ${name} fell by ${Math.abs(change).toFixed(2)}`);
  }

  const parts = [];
  if (rose.length > 0 && comparison.stillIsolated > 0) {
    const n = comparison.stillIsolated;
    const who = n === 1 ? "1 person was" : `${n} people were`;
    parts.push(`${rose.join(" and ")}, but ${who} isolated in both sessions`);
  }
  if (fell.length > 0 && comparison.newLinks > 0) {
    const n = comparison.newLinks;
    const what = n === 1 ? "1 new connection" : `${n} new connections`;
    parts.push(`${fell.join(" and ")}, but ${what} formed`);
  }
  if (parts.length === 0) return null;

  const sentence = `${parts.join("; ")}.`;
  return sentence[0].toUpperCase() + sentence.slice(1);
}

function firstSession(group) {
  return Math.min(...group.sessions.map((s) => s.number));
}

function lastSession(group) {
  return Math.max(...group.sessions.map((s) => s.number));
}

// Only kids at both sessions are compared. Otherwise a change in who showed
// up would look like a change in how kids felt.
function presentAtBoth(before, after) {
  return before.people.filter((id) => after.people.includes(id));
}

// Links in one network, between kids in both, that the other network
// doesn't have. Used both ways round: for new links and for lost links.
function pairsOnlyIn(network, other, both) {
  const otherPairs = new Set(other.links.map((link) => `${link.a} ${link.b}`));
  return network.links
    .filter((link) => both.includes(link.a) && both.includes(link.b))
    .filter((link) => !otherPairs.has(`${link.a} ${link.b}`))
    .map((link) => [link.a, link.b]);
}

// Only kids who answered this question both times count, so a skip in one
// session can't move the average.
function ratingChange(sessionA, sessionB, both, question) {
  let beforeTotal = 0;
  let afterTotal = 0;
  let count = 0;
  for (const id of both) {
    const before = sessionA.answers.find((row) => row.personId === id)?.[question];
    const after = sessionB.answers.find((row) => row.personId === id)?.[question];
    if (typeof before !== "number" || typeof after !== "number") continue;
    beforeTotal += before;
    afterTotal += after;
    count += 1;
  }
  if (count === 0) return { before: null, after: null, change: null, count: 0 };
  const beforeAverage = beforeTotal / count;
  const afterAverage = afterTotal / count;
  return { before: beforeAverage, after: afterAverage, change: afterAverage - beforeAverage, count };
}
