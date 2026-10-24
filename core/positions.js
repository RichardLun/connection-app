// Where each kid's dot goes in the network picture. The rules are in
// Step 10 of docs/build-steps.md.

export function circlePositions(group) {
  const people = [...group.people].sort((x, y) => x.name.localeCompare(y.name) || x.id.localeCompare(y.id));
  const n = people.length;
  const gap = 2 * Math.PI / n;

  const positions = {};
  for (let i = 0; i < n; i++) {
    const t = -Math.PI / 2 + i * gap;
    positions[people[i].id] = { x: 0.5 + 0.4 * Math.cos(t), y: 0.5 + 0.4 * Math.sin(t) };
  }
  return positions;
}