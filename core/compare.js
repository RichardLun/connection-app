// The before-and-after view of two sessions. The rules are in Step 8 of
// docs/build-steps.md, plus the checks in docs/trials.md: who answered each
// time, and whether the questions and timing were the same.
// This file must not import from lib/ or core/data.js, so Node can test it.
import { buildNetwork } from "./network.js";
import { average } from "./numbers.js";
import { QUESTIONS, RATING_IDS, sessionQuestionIds, questionDifferences, hasNetwork } from "./questions.js";
import { attendedCount, checkIns } from "./responses.js";

// The rating questions the warning sentence reads, with the words it uses.
const WARNING_NAMES = {
  q4: "closeness to the group (Q4)",
  q5: "belonging (Q5)",
  identification: "identification with the group",
};

export function newLinkPairs(group, a, b) {
  const before = buildNetwork(group, a);
  const after = buildNetwork(group, b);
  return pairsOnlyIn(after, before, presentAtBoth(before, after));
}

// The defaults use group, so they're worked out each time from the group
// being compared.
export function compareSessions(group, a = firstSession(group), b = lastSession(group)) {
  const sessionA = group.sessions.find((s) => s.number === a);
  const sessionB = group.sessions.find((s) => s.number === b);
  if (!sessionA || !sessionB) throw new Error(`This group has no session ${!sessionA ? a : b}`);
  const network = hasNetwork(sessionA) && hasNetwork(sessionB);
  const before = buildNetwork(group, a);
  const after = buildNetwork(group, b);
  const both = presentAtBoth(before, after);

  const comparison = {
    bothPresent: both.length,
    newLinks: network ? pairsOnlyIn(after, before, both).length : null,
    lostLinks: network ? pairsOnlyIn(before, after, both).length : null,
    stillIsolated: network
      ? both.filter((id) => before.status[id] === "isolate" && after.status[id] === "isolate").length
      : null,
    q4: ratingChange(sessionA, sessionB, both, "q4"),
    q5: ratingChange(sessionA, sessionB, both, "q5"),
    identification: ratingChange(sessionA, sessionB, both, "identification"),
    hasNetwork: network,
    respondents: respondents(group, sessionA, sessionB),
    ratings: ratingRows(group, sessionA, sessionB, both),
    questions: questionDifferences(sessionA, sessionB),
    timing: {
      before: sessionA.checkInTiming ?? null,
      after: sessionB.checkInTiming ?? null,
      same: (sessionA.checkInTiming ?? null) === (sessionB.checkInTiming ?? null),
    },
  };
  comparison.warning = network ? warningSentence(comparison) : null;
  return comparison;
}

export function warningSentence(comparison) {
  const rose = [];
  const fell = [];
  for (const question of Object.keys(WARNING_NAMES)) {
    const change = comparison[question]?.change ?? null;
    // Checking the rounded text, so a change only counts if a leader would
    // see it as something other than 0.00.
    if (change === null || Math.abs(change).toFixed(2) === "0.00") continue;
    const name = WARNING_NAMES[question];
    if (change > 0) rose.push(`average ${name} rose by ${change.toFixed(2)}`);
    else fell.push(`average ${name} fell by ${Math.abs(change).toFixed(2)}`);
  }

  const parts = [];
  if (rose.length > 0 && comparison.stillIsolated > 0) {
    const n = comparison.stillIsolated;
    const who = n === 1 ? "1 kid had" : `${n} kids had`;
    parts.push(`${rose.join(" and ")}, but ${who} no reported connections in both sessions`);
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

// Who came and who answered each time. A change in who answered can move an
// average even if nobody feels any different, so the screens show this next
// to every average.
function respondents(group, sessionA, sessionB) {
  const named = group.checkInMode !== "anonymous_survey";
  const before = checkIns(group, sessionA);
  const after = checkIns(group, sessionB);
  const result = {
    before: { attended: attendedCount(group, sessionA), checkedIn: before.length },
    after: { attended: attendedCount(group, sessionB), checkedIn: after.length },
    // Anonymous check-ins can't be matched up, so these stay unknown.
    checkedInBoth: null,
    onlyBefore: null,
    onlyAfter: null,
    same: null,
  };
  if (named) {
    const idsA = new Set(before.map((answer) => answer.personId));
    const idsB = new Set(after.map((answer) => answer.personId));
    result.checkedInBoth = [...idsA].filter((id) => idsB.has(id)).length;
    result.onlyBefore = idsA.size - result.checkedInBoth;
    result.onlyAfter = idsB.size - result.checkedInBoth;
    result.same = result.onlyBefore === 0 && result.onlyAfter === 0;
  }
  return result;
}

// One row per rating question either session asked: the average for
// everyone who answered, and the paired average for kids who were at both
// sessions and answered both times.
function ratingRows(group, sessionA, sessionB, both) {
  const askedA = sessionQuestionIds(sessionA);
  const askedB = sessionQuestionIds(sessionB);
  const named = group.checkInMode !== "anonymous_survey";
  return RATING_IDS.filter((id) => askedA.includes(id) || askedB.includes(id)).map((id) => {
    const question = QUESTIONS[id];
    const valuesA = askedA.includes(id) ? values(group, sessionA, question.field) : [];
    const valuesB = askedB.includes(id) ? values(group, sessionB, question.field) : [];
    const bothAsked = askedA.includes(id) && askedB.includes(id);
    return {
      id,
      label: question.label,
      min: question.min,
      max: question.max,
      askedBefore: askedA.includes(id),
      askedAfter: askedB.includes(id),
      everyone: { before: average(valuesA), beforeCount: valuesA.length, after: average(valuesB), afterCount: valuesB.length },
      paired: named && bothAsked ? ratingChange(sessionA, sessionB, both, question.field) : null,
    };
  });
}

function values(group, session, field) {
  return checkIns(group, session).map((answer) => answer[field]).filter((value) => typeof value === "number");
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
