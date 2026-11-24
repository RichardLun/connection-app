// Facts about one kid, worked out from the group object.

// True if the kid shows up anywhere in any session. The group screen only
// offers to remove kids without data, because deleting a kid also deletes
// everything saved about them.
export function hasData(group, personId) {
  return group.sessions.some((session) =>
    session.present.includes(personId) ||
    session.answers.some((answer) => answer.personId === personId) ||
    session.ticks.some((tick) => tick.from === personId || tick.to === personId));
}
