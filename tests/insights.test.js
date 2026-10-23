import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { peopleToCheckOn, REASON_TEXT } from "../core/insights.js";
import { buildNetwork } from "../core/network.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

// Read fresh each time, because some tests change the group.
function fakeSite() {
  return JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));
}

test("tiny example: Eli has no links and Fay didn't answer", () => {
  assert.deepEqual(peopleToCheckOn(tinyGroup(), 1), [
    { id: "p5", name: "Eli", reason: "no-links" },
    { id: "p6", name: "Fay", reason: "no-answer" },
  ]);
});

test("fake site, session 2: S15 and S16 twice, then S14", () => {
  assert.deepEqual(peopleToCheckOn(fakeSite(), 2), [
    { id: "S15", name: "S15", reason: "no-links-twice" },
    { id: "S16", name: "S16", reason: "no-links-twice" },
    { id: "S14", name: "S14", reason: "no-answer" },
  ]);
});

test("fake site, session 1: with no earlier session, nobody is twice", () => {
  assert.deepEqual(peopleToCheckOn(fakeSite(), 1), [
    { id: "S15", name: "S15", reason: "no-links" },
    { id: "S16", name: "S16", reason: "no-links" },
    { id: "S14", name: "S14", reason: "no-answer" },
  ]);
});

test("connected kids are never on the list", () => {
  const checks = [
    [tinyGroup(), 1],
    [fakeSite(), 1],
    [fakeSite(), 2],
  ];
  for (const [group, sessionNumber] of checks) {
    const status = buildNetwork(group, sessionNumber).status;
    for (const item of peopleToCheckOn(group, sessionNumber)) {
      assert.notEqual(status[item.id], "connected", `${item.id} is connected`);
    }
  }
});

test("a gap in session numbers still counts as last session", () => {
  const group = fakeSite();
  group.sessions[1].number = 5;
  const reasons = peopleToCheckOn(group, 5).map((item) => item.reason);
  assert.deepEqual(reasons, ["no-links-twice", "no-links-twice", "no-answer"]);
});

test("kids with the same reason are sorted by name, not id", () => {
  const group = fakeSite();
  group.people.find((person) => person.id === "S15").name = "Zed";
  group.people.find((person) => person.id === "S16").name = "amy";
  const names = peopleToCheckOn(group, 2).map((item) => item.name);
  assert.deepEqual(names, ["amy", "Zed", "S14"]);
});

test("every reason has a sentence for the screen", () => {
  for (const reason of ["no-links-twice", "no-links", "no-answer"]) {
    assert.equal(typeof REASON_TEXT[reason], "string");
  }
});
