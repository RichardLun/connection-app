// Turns one session's ticks into a network: who is linked to whom.
// The rules are in Step 5 of docs/build-steps.md.
// This file must not import from lib/ or core/data.js, so Node can test it.

export function buildNetwork(group, sessionNumber) {
  const session = group.sessions.find((s) => s.number === sessionNumber);
  if (!session) throw new Error(`This group has no session ${sessionNumber}`);

  // Copied first, because sort() changes the list it's called on and we
  // don't want to reorder the group's own data.
  const people = [...session.present].sort();

  // One entry per pair of kids, so two kids tapping each other still make
  // only one link.
  const linksByPair = new Map();
  for (const tick of session.ticks) {
    // Knowing someone before doesn't count: the network is about this session.
    if (!tick.workedWith && !tick.talkedTo) continue;
    if (tick.from === tick.to) continue;
    if (!people.includes(tick.from) || !people.includes(tick.to)) continue;

    // Putting the smaller id first means Ana tapping Ben and Ben tapping Ana
    // find the same pair.
    const [a, b] = [tick.from, tick.to].sort();
    const key = `${a} ${b}`;
    const link = linksByPair.get(key) ?? { a, b, worked: false, talked: false };
    link.worked = link.worked || tick.workedWith;
    link.talked = link.talked || tick.talkedTo;
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

  const status = {};
  for (const id of people) {
    const answer = session.answers.find((row) => row.personId === id);
    const answeredARating =
      answer !== undefined && (typeof answer.q4 === "number" || typeof answer.q5 === "number");
    if (degree[id] > 0) status[id] = "connected";
    else if (answeredARating) status[id] = "isolate";
    else status[id] = "unknown";
  }

  return { people, links, degree, status };
}

// Same order as sort() uses for people, so ids are ordered the same way
// everywhere.
function compareIds(x, y) {
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}
