import test from "node:test";
import assert from "node:assert/strict";
import { hasData } from "../core/people.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

test("a kid who was at a session has data", () => {
  assert.equal(hasData(tinyGroup(), "p1"), true);
});

test("a kid who was just added has no data", () => {
  const group = tinyGroup();
  group.people.push({ id: "p7", name: "Gus" });
  assert.equal(hasData(group, "p7"), false);
});

test("a kid who was only ticked by someone else still has data", () => {
  const group = tinyGroup();
  group.people.push({ id: "p7", name: "Gus" });
  group.sessions[0].ticks.push({ from: "p1", to: "p7", workedWith: true, talkedTo: false, knewBefore: false });
  assert.equal(hasData(group, "p7"), true);
});

test("a group with no sessions: nobody has data", () => {
  const group = tinyGroup();
  group.sessions = [];
  assert.equal(hasData(group, "p1"), false);
});
