// The numbers a leader sees for one session. The rules are in Step 6 of
// docs/build-steps.md. Nothing is rounded here: the screens round when they
// show a number.
import { buildNetwork } from "./network.js";

export function density(network) {
  const n = network.people.length;
  if (n < 2) {
    return null;
  }
  const possiblePairs = n * (n - 1) / 2;
  return network.links.length / possiblePairs;
}

export function centralization(network) {
  const n = network.people.length;
  // With fewer than 3 kids the formula divides by 0.
  if (n < 3) {
    return null;
  }
  const degrees = Object.values(network.degree);
  const highest = Math.max(...degrees);
  let total = 0;
  for (const degree of degrees) {
    total += highest - degree;
  }
  return total / ((n - 1) * (n - 2));
}

export function sessionNumbers(group, sessionNumber) {
  const network = buildNetwork(group, sessionNumber);
  const session = group.sessions.find((s) => s.number === sessionNumber);
  const n = network.people.length;
  const links = network.links.length;

  // Only count answers from kids who were present, the same way the network
  // ignores ticks from kids who weren't.
  const answers = session.answers.filter((answer) => network.people.includes(answer.personId));
  // Skipped ratings are null. Leaving them out, rather than counting them
  // as 0, stops a skip from dragging the average down.
  const q4s = answers.map((answer) => answer.q4).filter((q4) => typeof q4 === "number");
  const q5s = answers.map((answer) => answer.q5).filter((q5) => typeof q5 === "number");

  const statuses = Object.values(network.status);

  return {
    present: n,
    answered: answers.length,
    links,
    density: density(network),
    isolates: statuses.filter((status) => status === "isolate").length,
    unknown: statuses.filter((status) => status === "unknown").length,
    centralization: centralization(network),
    // The doc has no rule for an empty session, and 0 / 0 isn't a number.
    averageLinks: n === 0 ? null : 2 * links / n,
    q4Average: average(q4s),
    q4Count: q4s.length,
    q5Average: average(q5s),
    q5Count: q5s.length,
  };
}

function average(values) {
  if (values.length === 0) {
    return null;
  }
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / values.length;
}
