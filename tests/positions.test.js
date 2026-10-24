import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { circlePositions } from "../core/positions.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

const group = JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));

// Computers store decimals slightly imprecisely, so decimals are checked
// to be very close rather than exactly equal.
function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ${expected}, got ${actual}`);
}

function distance(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

test("every kid gets a position between 0 and 1", () => {
  const positions = circlePositions(group);
  assert.equal(Object.keys(positions).length, group.people.length);
  for (const person of group.people) {
    const { x, y } = positions[person.id];
    assert.ok(x >= 0 && x <= 1, `${person.id} has x ${x}`);
    assert.ok(y >= 0 && y <= 1, `${person.id} has y ${y}`);
  }
});

test("the same group always gives the same positions", () => {
  assert.deepEqual(circlePositions(group), circlePositions(group));
});

test("the order of group.people doesn't change anyone's spot", () => {
  const reversed = { ...group, people: [...group.people].reverse() };
  assert.deepEqual(circlePositions(reversed), circlePositions(group));
});

test("every dot is 0.4 from the center", () => {
  for (const position of Object.values(circlePositions(group))) {
    assertClose(distance(position, { x: 0.5, y: 0.5 }), 0.4);
  }
});

test("neighboring dots are evenly spaced", () => {
  const positions = circlePositions(group);
  // In the fake site, names sort the same way as ids.
  const ids = group.people.map((person) => person.id).sort();
  const first = distance(positions[ids[0]], positions[ids[1]]);
  for (let i = 0; i < ids.length; i++) {
    // The last dot's neighbor is the first one, all the way round.
    const next = ids[(i + 1) % ids.length];
    assertClose(distance(positions[ids[i]], positions[next]), first);
  }
});

test("the first kid alphabetically is at the top, and the next is clockwise", () => {
  const positions = circlePositions(tinyGroup());
  assertClose(positions.p1.x, 0.5);
  assertClose(positions.p1.y, 0.1);
  // Clockwise from the top means moving right.
  assert.ok(positions.p2.x > 0.5);
});

test("kids are ordered by name, not id", () => {
  const tiny = tinyGroup();
  tiny.people.find((person) => person.id === "p1").name = "Zoe";
  const positions = circlePositions(tiny);
  // Ben (p2) is now first alphabetically.
  assertClose(positions.p2.x, 0.5);
  assertClose(positions.p2.y, 0.1);
});

test("the group's own list of people isn't reordered", () => {
  const tiny = tinyGroup();
  tiny.people.reverse();
  const before = tiny.people.map((person) => person.id);
  circlePositions(tiny);
  assert.deepEqual(tiny.people.map((person) => person.id), before);
});

test("one kid sits at the top, and nobody gives no positions", () => {
  assert.deepEqual(Object.keys(circlePositions({ people: [] })), []);
  const positions = circlePositions({ people: [{ id: "p1", name: "Ana" }] });
  assertClose(positions.p1.x, 0.5);
  assertClose(positions.p1.y, 0.1);
});
