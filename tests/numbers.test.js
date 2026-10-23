import test from "node:test";
import assert from "node:assert/strict";
import { density, centralization, sessionNumbers } from "../core/numbers.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

// Computers store decimals slightly imprecisely, so decimals are checked
// to be very close rather than exactly equal.
function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ${expected}, got ${actual}`);
}

test("tiny example: the numbers from Step 6", () => {
  const numbers = sessionNumbers(tinyGroup(), 1);
  assert.equal(numbers.present, 6);
  assert.equal(numbers.answered, 5);
  assert.equal(numbers.links, 3);
  assertClose(numbers.density, 0.2);
  assert.equal(numbers.isolates, 1);
  assert.equal(numbers.unknown, 1);
  assertClose(numbers.centralization, 0.3);
  assertClose(numbers.averageLinks, 1);
  assertClose(numbers.q4Average, 4.5);
  assert.equal(numbers.q4Count, 4);
  assertClose(numbers.q5Average, 3.5);
  assert.equal(numbers.q5Count, 4);
});

test("density is null with fewer than 2 kids", () => {
  assert.equal(density({ people: ["p1"], links: [] }), null);
  assert.equal(density({ people: [], links: [] }), null);
});

test("centralization is null with fewer than 3 kids", () => {
  const network = {
    people: ["p1", "p2"],
    links: [{ a: "p1", b: "p2", worked: true, talked: false }],
    degree: { p1: 1, p2: 1 },
  };
  assert.equal(centralization(network), null);
});

test("averages are null if nobody answered", () => {
  const group = tinyGroup();
  group.sessions[0].answers = [];
  const numbers = sessionNumbers(group, 1);
  assert.equal(numbers.answered, 0);
  assert.equal(numbers.q4Average, null);
  assert.equal(numbers.q4Count, 0);
  assert.equal(numbers.q5Average, null);
  assert.equal(numbers.q5Count, 0);
});

test("a session with nobody present gives nulls, not NaN", () => {
  const group = tinyGroup();
  group.sessions[0].present = [];
  const numbers = sessionNumbers(group, 1);
  assert.equal(numbers.present, 0);
  assert.equal(numbers.density, null);
  assert.equal(numbers.centralization, null);
  assert.equal(numbers.averageLinks, null);
});

test("a star has centralization 1", () => {
  // p1 is linked to everyone, and nobody else is linked.
  const network = {
    people: ["p1", "p2", "p3", "p4", "p5"],
    links: [
      { a: "p1", b: "p2", worked: true, talked: false },
      { a: "p1", b: "p3", worked: true, talked: false },
      { a: "p1", b: "p4", worked: true, talked: false },
      { a: "p1", b: "p5", worked: true, talked: false },
    ],
    degree: { p1: 4, p2: 1, p3: 1, p4: 1, p5: 1 },
  };
  assertClose(centralization(network), 1);
});

test("everyone with the same number of links has centralization 0", () => {
  // A ring: each kid is linked to the two next to them.
  const network = {
    people: ["p1", "p2", "p3", "p4"],
    links: [
      { a: "p1", b: "p2", worked: true, talked: false },
      { a: "p1", b: "p4", worked: true, talked: false },
      { a: "p2", b: "p3", worked: true, talked: false },
      { a: "p3", b: "p4", worked: true, talked: false },
    ],
    degree: { p1: 2, p2: 2, p3: 2, p4: 2 },
  };
  assertClose(centralization(network), 0);
});

test("answers from kids who weren't present are left out", () => {
  const group = tinyGroup();
  group.sessions[0].present = ["p1", "p2", "p3", "p4", "p5"];
  group.sessions[0].answers.push(
    { personId: "p6", q4: 7, q5: 5, stayedWhole: "", firstTime: "" },
  );
  const numbers = sessionNumbers(group, 1);
  assert.equal(numbers.answered, 5);
  assert.equal(numbers.q4Count, 4);
  assertClose(numbers.q4Average, 4.5);
});
