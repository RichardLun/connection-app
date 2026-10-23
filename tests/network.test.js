import test from "node:test";
import assert from "node:assert/strict";
import { buildNetwork } from "../core/network.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

// Ids in the tiny example: p1 Ana, p2 Ben, p3 Cara, p4 Dev, p5 Eli, p6 Fay.

test("tiny example: everyone present is in people, sorted", () => {
  const network = buildNetwork(tinyGroup(), 1);
  assert.deepEqual(network.people, ["p1", "p2", "p3", "p4", "p5", "p6"]);
});

test("tiny example: three links, Ana-Ben, Ana-Cara and Cara-Dev", () => {
  const network = buildNetwork(tinyGroup(), 1);
  assert.deepEqual(network.links, [
    // Ana said worked and Ben said talked, so this link has both.
    { a: "p1", b: "p2", worked: true, talked: true },
    { a: "p1", b: "p3", worked: true, talked: true },
    { a: "p3", b: "p4", worked: false, talked: true },
  ]);
});

test("tiny example: degrees", () => {
  const network = buildNetwork(tinyGroup(), 1);
  assert.deepEqual(network.degree, { p1: 2, p2: 1, p3: 2, p4: 1, p5: 0, p6: 0 });
});

test("tiny example: statuses", () => {
  const network = buildNetwork(tinyGroup(), 1);
  assert.deepEqual(network.status, {
    p1: "connected",
    p2: "connected",
    p3: "connected",
    // Dev skipped everything, but Cara tapped him.
    p4: "connected",
    p5: "isolate",
    p6: "unknown",
  });
});


test("buildNetwork doesn't change the group it's given", () => {
  const group = tinyGroup();
  group.sessions[0].present.reverse();
  const before = structuredClone(group);
  buildNetwork(group, 1);
  assert.deepEqual(group, before);
});

test("asking for a session that doesn't exist throws", () => {
  assert.throws(() => buildNetwork(tinyGroup(), 99));
});


test("a tick with both boxes false", () => {
  const group = tinyGroup();
  group.sessions[0].ticks.push(
    {
      from: "p5", to: "p6", workedWith: false, talkedTo: false, knewBefore: true
    },
  );
  const network = buildNetwork(group, 1);
  assert.equal(network.links.length, 3);
  assert.equal(network.degree.p5, 0);
}
);

test("a kid tapping themself", () => {
  const group = tinyGroup();
  group.sessions[0].ticks.push(
    {
      from: "p5", to: "p5", workedWith: true, talkedTo: true, knewBefore: false
    },
  );
  const network = buildNetwork(group, 1);
  assert.equal(network.links.length, 3);
  assert.equal(network.degree.p5, 0);
}
);

test("a tick to someone who wasn't there", () => {
  const group = tinyGroup();
  group.sessions[0].present = ["p1", "p2", "p3", "p4", "p5"];
  group.sessions[0].ticks.push(
    {
      from: "p5", to: "p6", workedWith: true, talkedTo: true, knewBefore: false
    },
  );
  const network = buildNetwork(group, 1);
  assert.equal(network.links.length, 3);
  assert.equal(network.degree.p5, 0);
  assert.equal(network.degree.p6, undefined);
}
);