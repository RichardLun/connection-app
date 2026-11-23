// Which check-ins count for a session, and how many kids took part.
// This file must not import from lib/ or core/data.js, so Node can test it.

// Named check-ins only count for kids marked as here, the same way the
// network ignores ticks from kids who weren't. Anonymous check-ins all count.
export function checkIns(group, session) {
  if (group.checkInMode === "anonymous_survey") return session.anonymousAnswers ?? [];
  return session.answers.filter((answer) => session.present.includes(answer.personId));
}

// How many attended: the kids ticked as here, or for a group without names,
// the number the leader typed in (null until they do).
export function attendedCount(group, session) {
  if (group.checkInMode === "anonymous_survey") return session.attendedCount ?? null;
  return session.present.length;
}

// Learning answers from the check-ins that count.
export function learningAnswers(group, session) {
  const all = session.learningAnswers ?? [];
  if (group.checkInMode === "anonymous_survey") return all;
  const counted = new Set(checkIns(group, session).map((answer) => answer.personId));
  return all.filter((row) => counted.has(row.personId));
}
