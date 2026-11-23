import test from "node:test";
import assert from "node:assert/strict";
import {
  KINDS, QUESTIONS, QUESTION_ORDER, ORIGINAL_QUESTION_IDS, RATING_IDS,
  sessionQuestionIds, hasNetwork, choosableQuestionIds, defaultQuestionIds, questionIdsFor,
} from "../core/questions.js";
import { canSwitchPrivacy, showsIndividuals } from "../core/settings.js";
import { tinyGroup } from "./fixtures/tiny-group.js";

test("every question has one kind, wording, a source and a place to keep its answer", () => {
  assert.deepEqual([...QUESTION_ORDER].sort(), Object.keys(QUESTIONS).sort());
  for (const [id, question] of Object.entries(QUESTIONS)) {
    assert.ok(KINDS[question.kind], `${id} has a known kind`);
    assert.ok(question.label && question.source && question.field && question.note, `${id} is labelled`);
    assert.equal(typeof question.researchTested, "boolean");
    if (id !== "learning") assert.ok(question.wording, `${id} has wording`);
  }
  // Questions that aren't interaction, belonging or learning are flagged.
  for (const id of ["knew_before", "stayed_whole", "first_time"]) assert.equal(QUESTIONS[id].purposeUnclear, true);
});

test("rating scales match their options", () => {
  for (const id of RATING_IDS) {
    const { min, max, options } = QUESTIONS[id];
    assert.deepEqual(options.map((o) => o.value), Array.from({ length: max - min + 1 }, (_, i) => min + i));
  }
  assert.deepEqual([QUESTIONS.iis_circles.max, QUESTIONS.identification.max, QUESTIONS.belong_5pt.max], [7, 7, 5]);
  assert.equal(QUESTIONS.identification.field, "identification");
  assert.equal(QUESTIONS.belong_5pt.field, "q5");
});

test("older sessions asked the original questions, and the learning question only shows when set", () => {
  const session = { questions: null, learningQuestion: null };
  assert.deepEqual(sessionQuestionIds(session), ORIGINAL_QUESTION_IDS);
  assert.ok(hasNetwork(session));
  const survey = { questions: ["identification", "iis_circles"], learningQuestion: "What could you do?" };
  assert.deepEqual(sessionQuestionIds(survey), ["iis_circles", "identification", "learning"]);
  assert.equal(hasNetwork(survey), false);
});

test("new sessions start from the last session's questions, or a default for the group", () => {
  const regular = { ...tinyGroup(), sessions: [] };
  assert.deepEqual(defaultQuestionIds(regular), ["worked_with", "talked_to", "knew_before", "iis_circles", "identification"]);
  const single = { ...regular, groupType: "single_activity", checkInMode: "anonymous_survey" };
  assert.deepEqual(defaultQuestionIds(single), ["felt_included", "new_partner", "easier_next_time"]);
  // The tiny example's only session is an older one, so the next one copies it.
  assert.deepEqual(defaultQuestionIds(tinyGroup()), ORIGINAL_QUESTION_IDS);
});

test("the check-in mode decides the who-questions", () => {
  const survey = { ...tinyGroup(), checkInMode: "names_survey" };
  assert.deepEqual(questionIdsFor(survey, ["worked_with", "knew_before", "identification"]), ["identification"]);
  assert.deepEqual(questionIdsFor(tinyGroup(), ["identification", "iis_circles"]),
    ["worked_with", "talked_to", "iis_circles", "identification"]);
  assert.ok(!choosableQuestionIds(survey).includes("knew_before"));
  // The older 1-to-5 question is only offered to groups that already asked it.
  assert.ok(choosableQuestionIds(tinyGroup()).includes("belong_5pt"));
  assert.ok(!choosableQuestionIds({ ...tinyGroup(), sessions: [] }).includes("belong_5pt"));
});

test("privacy: leader support needs names and interactions, and can't be turned on after check-ins", () => {
  const group = tinyGroup();
  assert.equal(showsIndividuals(group), true);
  assert.equal(showsIndividuals({ ...group, reportPrivacy: undefined }), false);
  assert.equal(showsIndividuals({ ...group, checkInMode: "names_survey" }), false);
  assert.equal(canSwitchPrivacy(group, "group_only"), true);
  assert.equal(canSwitchPrivacy(group, "leader_support"), false);
  assert.equal(canSwitchPrivacy({ ...group, sessions: [] }, "leader_support"), true);
});
