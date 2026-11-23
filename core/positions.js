// Where each kid's dot goes in the network picture. The rules are in
// Step 10 of docs/build-steps.md.

// Kids go round in name order, so a leader can find a name. When names are
// hidden (group-only pictures and the report), only the kids who were at the
// session get a spot, in an order shuffled differently for every session.
// Fixed spots would leave a gap where an absent kid sits, and a leader who
// knew who was away could then find that kid's dot on other days.
export function circlePositions(group, { byName = true, session } = {}) {
  const ids = byName
    ? [...group.people].sort((x, y) => x.name.localeCompare(y.name) || x.id.localeCompare(y.id)).map((person) => person.id)
    : shuffledIds(session);
  const n = ids.length;
  const gap = 2 * Math.PI / n;

  const positions = {};
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + i * gap;
    positions[ids[i]] = { x: 0.5 + 0.4 * Math.cos(t), y: 0.5 + 0.4 * Math.sin(t) };
  }
  return positions;
}

// Sorting by a hash of the session and the kid gives each session its own
// order, while the same session always draws the same way on every screen.
function shuffledIds(session) {
  if (!session) throw new Error("A picture without names needs its session, to place only the kids who were there");
  const key = session.id ?? session.number;
  const ids = [...new Set(session.present)];
  const order = new Map(ids.map((id) => [id, hash(`${key} ${id}`)]));
  return ids.sort((x, y) => order.get(x) - order.get(y) || x.localeCompare(y));
}

// Turns text into a whole number that looks random: FNV-1a, then a final
// mix so that similar ids (S01, S02...) still land far apart. It isn't
// secret; it only has to scatter the kids.
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
