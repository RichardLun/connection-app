// Kids a leader might want to check on. The rules are in Step 9 of
// docs/build-steps.md.
// This file must not import from lib/ or core/data.js, so Node can test it.
import { buildNetwork } from "./network.js";

// Leaders read these, so they describe what happened without labelling
// the kid.
export const REASON_TEXT = {
  "no-links-twice": "No connections this session and last session",
  "no-links": "No connections this session",
  "no-answer": "Didn't fill in the check-in",
};

// Most worrying first, so it's the first thing a leader sees.
const REASON_ORDER = ["no-links-twice", "no-links", "no-answer"];

export function peopleToCheckOn(group, sessionNumber) {
  const network = buildNetwork(group, sessionNumber);
  const previous = previousSession(group, sessionNumber);
  // With no earlier session, nobody can have been an isolate "last time".
  const previousStatus = previous === null ? {} : buildNetwork(group, previous).status;

  const list = [];
  for (const id of network.people) {
    let reason;
    if (network.status[id] === "isolate") {
      reason = previousStatus[id] === "isolate" ? "no-links-twice" : "no-links";
    } else if (network.status[id] === "unknown") {
      reason = "no-answer";
    } else {
      continue;
    }
    const name = group.people.find((person) => person.id === id).name;
    list.push({ id, name, reason });
  }

  // localeCompare sorts names the way people expect, so "ana" isn't put
  // after every name starting with a capital letter.
  return list.sort(
    (x, y) =>
      REASON_ORDER.indexOf(x.reason) - REASON_ORDER.indexOf(y.reason) ||
      x.name.localeCompare(y.name),
  );
}

// The next-lower session number, so a gap like 3 then 5 still counts as
// "last session".
function previousSession(group, sessionNumber) {
  const earlier = group.sessions.map((s) => s.number).filter((n) => n < sessionNumber);
  return earlier.length === 0 ? null : Math.max(...earlier);
}
