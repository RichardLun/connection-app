// Draws the network picture for one session, for the results and compare screens.
// The rules are in Step 15 of docs/frontend-steps.md.
import { buildNetwork } from "../core/network.js";
import { circlePositions } from "../core/positions.js";
import { el, svgEl } from "./app.js";

const STATUS_TEXT = {
  connected: "Connected with someone",
  isolate: "No connections",
  unknown: "Didn't check in",
};

export function drawPicture(group, sessionNumber, { highlight = [] } = {}) {
  const network = buildNetwork(group, sessionNumber);
  const positions = circlePositions(group);
  const spot = (id) => ({ x: positions[id].x * 100, y: positions[id].y * 100 });
  const nameOf = (id) => group.people.find((person) => person.id === id).name;

  // Sorted the same way buildNetwork sorts a link's ids, so a pair matches
  // whichever order it's given in.
  const highlighted = new Set(highlight.map((pair) => [...pair].sort().join(" ")));
  const isHighlighted = (link) => highlighted.has(`${link.a} ${link.b}`);

  // Highlighted lines go last, so they're drawn on top of the others.
  const lines = [...network.links].sort((x, y) => isHighlighted(x) - isHighlighted(y)).map((link) => {
    const a = spot(link.a);
    const b = spot(link.b);
    return svgEl("line", { class: isHighlighted(link) ? "link highlight" : "link", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });
  // A green border makes the kids in a new link easy to find, not just the line.
  const inNewLink = new Set(highlight.flat());
  const dots = network.people.map((id) => {
    const { x, y } = spot(id);
    const kind = inNewLink.has(id) ? `${network.status[id]} new` : network.status[id];
    return svgEl("circle", { class: `dot ${kind}`, cx: x, cy: y, r: dotSize(network.degree[id]) });
  });
  const names = network.people.map((id) => nameLabel(spot(id), dotSize(network.degree[id]), nameOf(id)));

  return svgEl("svg", {
    class: "picture",
    viewBox: "0 0 100 100",
    role: "img",
    "aria-label": `${network.people.length} kids, ${network.links.length} connections`,
  }, lines, dots, names);
}

// The key goes under the picture rather than inside it, where it would bump
// into the names of a big group.
export function pictureKey({ showNew = false } = {}) {
  return el("ul", { className: "picture-key" },
    Object.entries(STATUS_TEXT).map(([status, text]) => el("li", {}, el("span", { className: `swatch ${status}` }), text)),
    showNew ? el("li", {}, el("span", { className: "swatch highlight" }), "New connection (green line and border)") : null,
    el("li", {}, "Bigger dots: more connections"),
  );
}

// Kids with no links still get a clear dot, because they're the ones a leader
// most needs to see. Small enough, and capped, so that in a group of 20 the
// lines between neighbouring dots stay visible.
function dotSize(links) {
  return 1.75 + 0.35 * Math.min(links, 5);
}

// Pushes the name out from the middle of the circle, so it sits outside the
// ring of dots and off the lines. Bigger dots push it further.
function nameLabel({ x, y }, radius, name) {
  const dx = (x - 50) / 40;
  const dy = (y - 50) / 40;
  const anchor = dx > 0.3 ? "start" : dx < -0.3 ? "end" : "middle";
  return svgEl("text", {
    class: "name",
    x: x + dx * (radius + 2),
    y: y + dy * (radius + 2),
    "text-anchor": anchor,
    "dominant-baseline": "middle",
  }, name);
}
