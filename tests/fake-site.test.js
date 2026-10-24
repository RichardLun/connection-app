import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sessionNumbers } from "../core/numbers.js";
import { buildNetwork } from "../core/network.js";

const group = JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));
function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 0.001, `expected ${expected}, got ${actual}`);
}

test("fake site, session 1", () => {
  const numbers = sessionNumbers(group, 1);
  assert.equal(numbers.present, 20);
  assert.equal(numbers.answered, 20);
  assert.equal(numbers.links, 19);
  assertClose(numbers.density, 0.100);
  assert.equal(numbers.isolates, 2);
  assert.equal(numbers.unknown, 1);
  assertClose(numbers.centralization, 0.532);
  assertClose(numbers.averageLinks, 1.90);
  assertClose(numbers.q4Average, 4.00);
  assert.equal(numbers.q4Count, 18);
  assertClose(numbers.q5Average, 3.00);
  assert.equal(numbers.q5Count, 18);
});

test("fake site, session 2", () => {
  const numbers = sessionNumbers(group, 2);
  assert.equal(numbers.present, 16);
  assert.equal(numbers.answered, 16);
  assert.equal(numbers.links, 22);
  assertClose(numbers.density, 0.183);
  assert.equal(numbers.isolates, 2);
  assert.equal(numbers.unknown, 1);
  assertClose(numbers.centralization, 0.629);
  assertClose(numbers.averageLinks, 2.75);
  assertClose(numbers.q4Average, 5.00);
  assert.equal(numbers.q4Count, 15);
  assertClose(numbers.q5Average, 4.00);
  assert.equal(numbers.q5Count, 15);
});

test("fake site: statuses in session 1", () => {
  const network = buildNetwork(group, 1);
  assert.equal(network.status.S13, "connected");
  assert.equal(network.status.S14, "unknown");
  assert.equal(network.status.S15, "isolate");
  assert.equal(network.status.S16, "isolate");
});

test("fake site: statuses in session 2", () => {
  const network = buildNetwork(group, 2);
  assert.equal(network.status.S13, "connected");
  assert.equal(network.status.S14, "unknown");
  assert.equal(network.status.S15, "isolate");
  assert.equal(network.status.S16, "isolate");
});