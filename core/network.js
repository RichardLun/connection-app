// Turns one session's ticks into a network: who is linked to whom.
// The rules are in Step 5 of docs/build-steps.md.
// This file must not import from lib/ or core/data.js, so Node can test it.

// Which ticks make a link. "either" (worked with or talked to) is the
// network every number uses. The others are one kind of relationship at a
// time, for the exports and the public-data check, and are always labelled.
export const RELATIONS = {
  either: { label: "Worked with or talked to (either kid said so)", ticks: ["workedWith", "talkedTo"], statuses: ["workedWithStatus", "talkedToStatus"] },
  worked: { label: "Worked with (either kid said so)", ticks: ["workedWith"], statuses: ["workedWithStatus"] },
  talked: { label: "Talked to (either kid said so)", ticks: ["talkedTo"], statuses: ["talkedToStatus"] },
  knew: { label: "Knew before joining (either kid said so)", ticks: ["knewBefore"], statuses: ["knewBeforeStatus"] },
};

export function buildNetwork(group, sessionNumber, { relation = "either" } = {}) {
  const session = group.sessions.find((s) => s.number === sessionNumber);
  if (!session) throw new Error(`This group has no session ${sessionNumber}`);
  const rule = RELATIONS[relation];
  if (!rule) throw new Error(`Unknown relation ${relation}`);

  // Copied first, because sort() changes the list it's called on and we
  // don't want to reorder the group's own data.
  const people = [...session.present].sort();

  // One entry per pair of kids, so two kids tapping each other still make
  // only one link.
  const linksByPair = new Map();
  for (const tick of session.ticks) {
    // Knowing someone before doesn't count unless asked for: the network is
    // about this session.
    if (!rule.ticks.some((field) => tick[field])) continue;
    if (tick.from === tick.to) continue;
    if (!people.includes(tick.from) || !people.includes(tick.to)) continue;

    // Putting the smaller id first means Ana tapping Ben and Ben tapping Ana
    // find the same pair.
    const [a, b] = [tick.from, tick.to].sort();
    const key = `${a} ${b}`;
    const link = linksByPair.get(key) ?? { a, b, worked: false, talked: false };
    link.worked = link.worked || Boolean(tick.workedWith);
    link.talked = link.talked || Boolean(tick.talkedTo);
    linksByPair.set(key, link);
  }
  const links = [...linksByPair.values()].sort(
    (x, y) => compareIds(x.a, y.a) || compareIds(x.b, y.b),
  );

  const degree = {};
  for (const id of people) degree[id] = 0;
  for (const link of links) {
    degree[link.a] += 1;
    degree[link.b] += 1;
  }

  // Nobody linked to a kid only makes them an isolate if they answered the
  // "who" question(s) themselves. Skipping, being away or not checking in
  // leaves it unknown, because a blank isn't the same as "nobody".
  const status = {};
  for (const id of people) {
    const answer = session.answers.find((row) => row.personId === id);
    if (degree[id] > 0) status[id] = "connected";
    else if (answer !== undefined && answeredWho(answer, relation)) status[id] = "isolate";
    else status[id] = "unknown";
  }

  return { people, links, degree, status };
}

// True if the kid gave an answer (names or "Nobody") to every "who" question
// this relation uses that they were asked.
export function answeredWho(answer, relation = "either") {
  const statuses = RELATIONS[relation].statuses.map((field) => answer[field]).filter((s) => s != null);
  if (statuses.length > 0) return statuses.every((s) => s === "named" || s === "none");
  // Check-ins from before November 2026 didn't record "Nobody" or "Skip".
  // For them, answering a rating counts as handing in the sheet, as on paper.
  if (relation === "knew") return false;
  return typeof answer.q4 === "number" || typeof answer.q5 === "number";
}

// Same order as sort() uses for people, so ids are ordered the same way
// everywhere.
function compareIds(x, y) {
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}
