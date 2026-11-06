import { sessionNumbers } from "./numbers.js";
import { compareSessions } from "./compare.js";

export function sessionOverviewData(group, sessionNumber) {
  return validateOverviewData({
    kind: "session",
    session: { number: sessionNumber, numbers: sessionNumbers(group, sessionNumber) },
  });
}

export function comparisonOverviewData(group, before, after) {
  const result = compareSessions(group, before, after);
  return validateOverviewData({
    kind: "comparison",
    before: { number: before, numbers: sessionNumbers(group, before) },
    after: { number: after, numbers: sessionNumbers(group, after) },
    comparison: {
      bothPresent: result.bothPresent,
      newLinks: result.newLinks,
      lostLinks: result.lostLinks,
      stillIsolated: result.stillIsolated,
      q4: result.q4,
      q5: result.q5,
    },
  });
}

// Only these numeric fields can leave the app. Reject extra fields instead of
// forwarding a group object, a name, or text someone could use as a prompt.
export function validateOverviewData(data) {
  if (data?.kind === "session") {
    record(data, ["kind", "session"]);
    return { kind: "session", session: validateSession(data.session) };
  }
  if (data?.kind !== "comparison") throw new TypeError("Choose a session or comparison overview.");
  record(data, ["kind", "before", "after", "comparison"]);
  const before = validateSession(data.before);
  const after = validateSession(data.after);
  if (before.number === after.number) throw new TypeError("Choose two different sessions.");
  const c = data.comparison;
  record(c, ["bothPresent", "newLinks", "lostLinks", "stillIsolated", "q4", "q5"]);
  count(c.bothPresent, Math.min(before.numbers.present, after.numbers.present));
  count(c.newLinks, after.numbers.links);
  count(c.lostLinks, before.numbers.links);
  count(c.stillIsolated, Math.min(c.bothPresent, before.numbers.isolates, after.numbers.isolates));
  if (c.newLinks + c.lostLinks > c.bothPresent * (c.bothPresent - 1) / 2) invalid();
  return {
    kind: "comparison", before, after,
    comparison: {
      bothPresent: c.bothPresent, newLinks: c.newLinks,
      lostLinks: c.lostLinks, stillIsolated: c.stillIsolated,
      q4: validatePaired(c.q4, 7, Math.min(c.bothPresent, before.numbers.q4Count, after.numbers.q4Count)),
      q5: validatePaired(c.q5, 5, Math.min(c.bothPresent, before.numbers.q5Count, after.numbers.q5Count)),
    },
  };
}

function validateSession(session) {
  record(session, ["number", "numbers"]);
  count(session.number);
  if (session.number < 1) invalid();
  const n = session.numbers;
  const fields = [
    "present", "answered", "links", "density", "isolates", "unknown",
    "centralization", "averageLinks", "q4Average", "q4Count", "q5Average", "q5Count",
  ];
  record(n, fields);
  count(n.present);
  count(n.answered, n.present);
  count(n.links, n.present * (n.present - 1) / 2);
  count(n.isolates, n.answered);
  count(n.unknown, n.present - n.isolates);
  count(n.q4Count, n.answered);
  count(n.q5Count, n.answered);
  average(n.q4Average, n.q4Count, 7);
  average(n.q5Average, n.q5Count, 5);
  if (n.present < 2) {
    if (n.density !== null) invalid();
  } else {
    range(n.density, 0, 1);
    equal(n.density, 2 * n.links / (n.present * (n.present - 1)));
  }
  if (n.present < 3) {
    if (n.centralization !== null) invalid();
  } else {
    range(n.centralization, 0, 1);
  }
  if (n.present === 0) {
    if (n.averageLinks !== null) invalid();
  } else {
    range(n.averageLinks, 0, n.present - 1);
    equal(n.averageLinks, 2 * n.links / n.present);
  }
  return { number: session.number, numbers: Object.fromEntries(fields.map((key) => [key, n[key]])) };
}

function validatePaired(rating, maximum, limit) {
  record(rating, ["before", "after", "change", "count"]);
  count(rating.count, limit);
  average(rating.before, rating.count, maximum);
  average(rating.after, rating.count, maximum);
  if (rating.count === 0) {
    if (rating.change !== null) invalid();
  } else {
    range(rating.change, 1 - maximum, maximum - 1);
    equal(rating.change, rating.after - rating.before);
  }
  return { before: rating.before, after: rating.after, change: rating.change, count: rating.count };
}

function record(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    throw new TypeError("Overview inputs must contain only the expected group-level numbers.");
  }
}

function count(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) invalid();
}

function range(value, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) invalid();
}

function average(value, answers, maximum) {
  if (answers === 0) {
    if (value !== null) invalid();
  } else {
    range(value, 1, maximum);
  }
}

function equal(actual, expected) {
  if (Math.abs(actual - expected) > 0.00000001) invalid();
}

function invalid() {
  throw new TypeError("The overview numbers are missing or inconsistent. Reload the results and try again.");
}
