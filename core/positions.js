// Where each kid's dot goes in the network picture. The rules are in
// Step 10 of docs/build-steps.md.

// Kids go round in name order, so a leader can find a name. When names are
// hidden (group-only reports), they go in id order instead, which says
// nothing about who is where.
export function circlePositions(group, { byName = true } = {}) {
  const people = [...group.people].sort((x, y) =>
    (byName ? x.name.localeCompare(y.name) : 0) || x.id.localeCompare(y.id));
  const n = people.length;
  const gap = 2 * Math.PI / n;

  const positions = {};
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + i * gap;
    positions[people[i].id] = { x: 0.5 + 0.4 * Math.cos(t), y: 0.5 + 0.4 * Math.sin(t) };
  }
  return positions;
}