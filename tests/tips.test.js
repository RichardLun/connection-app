import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QUESTIONS } from "../core/questions.js";

// Every leader screen has a tips sheet and the "?" link to the welcome
// screen. The kids' check-in screen has neither.
const LEADER_SCREENS = ["groups", "group", "session", "results", "compare", "report"];
const read = (name) => readFileSync(new URL(`../ui/${name}.html`, import.meta.url), "utf8");

for (const name of LEADER_SCREENS) {
  test(`${name} screen has a tips sheet and the welcome link`, () => {
    const html = read(name);
    assert.match(html, /<dialog id="tips"/);
    assert.match(html, /src="tips\.js"/);
    assert.match(html, /class="help" href="welcome\.html"/);
  });
}

test("the kids' check-in screen has no tips or welcome link", () => {
  const html = read("checkin");
  assert.doesNotMatch(html, /tips\.js|welcome\.html/);
});

// Question wording lives only in core/questions.js (see CLAUDE.md), so the
// help text can't go out of date when the wording changes.
test("no tips sheet or the welcome screen types out a question's wording", () => {
  const pages = [...LEADER_SCREENS, "welcome"].map((name) => [name, read(name)]);
  for (const question of Object.values(QUESTIONS)) {
    if (!question.wording) continue;
    for (const [name, html] of pages) {
      assert.ok(!html.includes(question.wording), `${name}.html repeats "${question.wording}"`);
    }
  }
});
