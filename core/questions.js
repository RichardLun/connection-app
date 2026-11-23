// Every question Connected can ask, in one place. The check-in screen, the
// results, the report and the exports all take the wording, answer options
// and scoring from here, so agreed wording only has to be changed here.
// docs/question-labels.md explains why each question is labelled the way it is.
// This file must not import from lib/ or core/data.js, so Node can test it.
//
// Two rules keep old answers meaningful:
// - Once a session has asked a question, never change its wording, options
//   or scoring. Add a new question with a new id instead. Sessions store the
//   ids they asked, so each answer keeps the exact question it was given.
// - Every question has one kind, and results stay apart by kind. Talking to
//   lots of people doesn't mean feeling included, so nothing here (or
//   anywhere else) adds answers up into one "connection score".

export const KINDS = {
  interaction: { label: "Interaction", asks: "Who talked or worked with whom during the activity" },
  belonging: { label: "Belonging", asks: "Whether kids felt accepted and included in the group" },
  learning: { label: "Learning", asks: "What kids can identify or do after the activity" },
  feedback: { label: "Activity feedback", asks: "What would make it easier to take part next time" },
  context: { label: "Context", asks: "Background for reading the other answers. Not one of the three kinds" },
};

const AGREE_7 = [
  "Strongly disagree", "Disagree", "Slightly disagree", "Neither agree nor disagree",
  "Slightly agree", "Agree", "Strongly agree",
];
const AGREE_5 = ["Strongly disagree", "Disagree", "Not sure", "Agree", "Strongly agree"];
const YES_NO = [{ value: "Y", label: "Yes" }, { value: "N", label: "No" }];
const scale = (labels) => labels.map((label, i) => ({ value: i + 1, label }));

// type is how kids answer: "names" (tap names, or Nobody), "circles" (pick a
// picture), "scale" (one numbered choice), "choice" (one choice), "choices"
// (any number of choices) or "text". field is where the answer is kept in
// the group object from core/data.js.
export const QUESTIONS = {
  worked_with: {
    kind: "interaction",
    label: "Who they worked with",
    wording: "Who did you work with today?",
    type: "names",
    relation: "worked",
    field: "workedWith",
    statusField: "workedWithStatus",
    source: "Connected (from the paper roster sheet)",
    researchTested: false,
    note: "Builds the network. A pair is linked if either kid named the other.",
  },
  talked_to: {
    kind: "interaction",
    label: "Who they talked to",
    wording: "Who did you talk to today?",
    type: "names",
    relation: "talked",
    field: "talkedTo",
    statusField: "talkedToStatus",
    source: "Connected (from the paper roster sheet)",
    researchTested: false,
    note: "Builds the network, together with worked with.",
  },
  knew_before: {
    kind: "context",
    label: "Who they knew before joining",
    wording: "Who did you already know before you joined this group?",
    type: "names",
    relation: "knew",
    field: "knewBefore",
    statusField: "knewBeforeStatus",
    source: "Connected",
    researchTested: false,
    firstCheckInOnly: true,
    purposeUnclear: true,
    note: "A relationship from before the group, not an interaction today. Only asked at a kid's first check-in. Not used in any number yet.",
  },
  iis_circles: {
    kind: "belonging",
    label: "Closeness to the group (overlapping circles)",
    shortLabel: "Closeness (circles)",
    wording: "Which picture best shows how close you feel to this group?",
    hint: "The blue circle is you. The orange circle is the group.",
    type: "circles",
    options: [1, 2, 3, 4, 5, 6, 7].map((value) => ({ value, label: String(value) })),
    min: 1,
    max: 7,
    field: "q4",
    scoring: "1 (circles apart) to 7 (circles almost on top of each other). Higher means closer.",
    source: "Inclusion of Ingroup in the Self (IIS), Tropp & Wright (2001)",
    researchTested: true,
    note: "Teen Q4 in the survey draft. The draft's younger-child version (Q3) uses simpler wording, which isn't in Connected yet.",
  },
  belong_5pt: {
    kind: "belonging",
    label: "How much they feel they belong (first Connected version)",
    shortLabel: "Belonging (1 to 5)",
    wording: "How much do you feel you belong in this group?",
    type: "scale",
    options: scale(["Not at all", "A little", "Somewhat", "Quite a bit", "Very much"]),
    min: 1,
    max: 5,
    field: "q5",
    scoring: "1 (not at all) to 5 (very much).",
    source: "Connected (first version). Not a published measure",
    researchTested: false,
    retired: true,
    note: "Asked as Q5 before November 2026. It is not the survey draft's \"I identify with this group\" item (1 to 7), so its answers are never mixed with that one. Only offered to groups that already used it, to keep their sessions comparable.",
  },
  identification: {
    kind: "belonging",
    label: "Identifies with the group",
    shortLabel: "Identification (1 to 7)",
    wording: "I identify with this group.",
    hint: "How much do you agree?",
    type: "scale",
    options: scale(AGREE_7),
    min: 1,
    max: 7,
    field: "identification",
    scoring: "1 (strongly disagree) to 7 (strongly agree).",
    source: "Single-item social identification, Postmes, Haslam & Jans (2013)",
    researchTested: true,
    note: "Teen Q5 in the survey draft. The draft doesn't ask it of younger children.",
  },
  felt_included: {
    kind: "belonging",
    label: "Felt included during the activity",
    shortLabel: "Felt included (1 to 5)",
    wording: "During today's activity, I felt included.",
    hint: "How much do you agree?",
    type: "scale",
    options: scale(AGREE_5),
    min: 1,
    max: 5,
    field: "feltIncluded",
    scoring: "1 (strongly disagree) to 5 (strongly agree).",
    source: "Optional feedback question from the next-steps doc. Not research-tested",
    researchTested: false,
    note: "About the activity experience. The answer options are a placeholder until GFM agrees on them.",
  },
  new_partner: {
    kind: "interaction",
    label: "Worked with someone new",
    wording: "Did you work with someone you hadn't worked with before?",
    type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "no_opportunity", label: "There wasn't an opportunity to" },
    ],
    field: "newPartner",
    source: "Optional feedback question from the next-steps doc. Not research-tested",
    researchTested: false,
    note: "A kid's own report about today. It doesn't say who, so it isn't part of the network.",
  },
  easier_next_time: {
    kind: "feedback",
    label: "What would make it easier to take part",
    wording: "What would make it easier to take part next time?",
    hint: "Pick all that fit.",
    type: "choices",
    options: [
      { value: "smaller_groups", label: "Smaller groups" },
      { value: "clearer_instructions", label: "Clearer instructions" },
      { value: "more_time", label: "More time" },
      { value: "another_way", label: "Another way to take part" },
      { value: "nothing", label: "Nothing needs to change", alone: true },
    ],
    field: "easierNextTime",
    source: "Optional feedback question from the next-steps doc. Not research-tested",
    researchTested: false,
    note: "Helps staff improve the activity. Not a measure of belonging or interaction.",
  },
  stayed_whole: {
    kind: "context",
    label: "Stayed for the whole session",
    wording: "Did you stay for the whole session?",
    type: "choice",
    options: YES_NO,
    field: "stayedWhole",
    source: "Connected (from the paper sheet)",
    researchTested: false,
    purposeUnclear: true,
    note: "Not used in any number. It could explain fewer connections for a kid who left early.",
  },
  first_time: {
    kind: "context",
    label: "First time at this group",
    wording: "Was today your first time at this group?",
    type: "choice",
    options: YES_NO,
    field: "firstTime",
    source: "Connected (from the paper sheet)",
    researchTested: false,
    purposeUnclear: true,
    note: "Not used in any number. It could explain why a new kid knows nobody yet.",
  },
  learning: {
    kind: "learning",
    label: "Learning question",
    // Staff write the question for each activity, so it comes from the session.
    wording: null,
    hint: "Write your answer in a few words.",
    type: "text",
    field: "learningAnswer",
    source: "Written by staff for the activity's goal (see docs/question-labels.md)",
    researchTested: false,
    note: "Checks what kids can identify or do, not how they felt. Answers are shown on their own.",
  },
};

for (const [id, question] of Object.entries(QUESTIONS)) question.id = id;

// The order kids see them in, whatever order they were picked in.
export const QUESTION_ORDER = [
  "worked_with", "talked_to", "knew_before", "iis_circles", "belong_5pt", "identification",
  "felt_included", "new_partner", "easier_next_time", "learning", "stayed_whole", "first_time",
];

// What every session asked before sessions stored their questions.
export const ORIGINAL_QUESTION_IDS = [
  "worked_with", "talked_to", "knew_before", "iis_circles", "belong_5pt", "stayed_whole", "first_time",
];

// The questions that give a number from min to max.
export const RATING_IDS = QUESTION_ORDER.filter((id) => typeof QUESTIONS[id].min === "number");

const NETWORK_IDS = ["worked_with", "talked_to"];

// The ids a session asked, in check-in order. The learning question is
// included when the session has one, or when learning is true (the report
// uses that to keep showing answers saved before a question was cleared).
export function sessionQuestionIds(session, { learning = Boolean(session.learningQuestion) } = {}) {
  const ids = new Set(session.questions ?? ORIGINAL_QUESTION_IDS);
  if (learning) ids.add("learning");
  else ids.delete("learning");
  return QUESTION_ORDER.filter((id) => ids.has(id));
}

// The questions a session asked, with the learning question's own wording.
export function sessionQuestions(session, options) {
  return sessionQuestionIds(session, options).map((id) =>
    id === "learning" ? { ...QUESTIONS.learning, wording: session.learningQuestion ?? null } : QUESTIONS[id]);
}

export function asks(session, id) {
  return sessionQuestionIds(session).includes(id);
}

// A network needs at least one "who" question about today.
export function hasNetwork(session) {
  return NETWORK_IDS.some((id) => asks(session, id));
}

// The questions a leader can choose from when starting a session. The "who"
// questions come with the group's check-in mode instead of being picked.
export function choosableQuestionIds(group) {
  const usedOriginal = group.sessions.some((s) => sessionQuestionIds(s).includes("belong_5pt"));
  return QUESTION_ORDER.filter((id) =>
    !NETWORK_IDS.includes(id) && id !== "learning" &&
    (id !== "knew_before" || usesInteractions(group)) &&
    (id !== "belong_5pt" || usedOriginal));
}

// What a new session asks unless the leader changes it. A group that meets
// regularly keeps the last session's questions, so sessions stay comparable.
export function defaultQuestionIds(group) {
  const last = [...group.sessions].sort((a, b) => b.number - a.number)[0];
  if (last) return sessionQuestionIds(last).filter((id) => id !== "learning");
  const picked = group.groupType === "single_activity"
    ? ["felt_included", "new_partner", "easier_next_time"]
    : ["knew_before", "iis_circles", "identification"];
  return questionIdsFor(group, picked);
}

// Adds the "who" questions the check-in mode needs, drops anything the mode
// can't ask, and puts them in check-in order. This is what gets saved.
export function questionIdsFor(group, picked) {
  const ids = new Set(picked.filter((id) => QUESTIONS[id] && id !== "learning" && !NETWORK_IDS.includes(id)));
  if (usesInteractions(group)) for (const id of NETWORK_IDS) ids.add(id);
  else ids.delete("knew_before");
  return QUESTION_ORDER.filter((id) => ids.has(id));
}

// What changed between two sessions' questions, for the compare screen.
// The learning question is left out: it's written for each activity.
export function questionDifferences(sessionA, sessionB) {
  const a = sessionQuestionIds(sessionA).filter((id) => id !== "learning");
  const b = sessionQuestionIds(sessionB).filter((id) => id !== "learning");
  return {
    same: a.length === b.length && a.every((id) => b.includes(id)),
    onlyBefore: a.filter((id) => !b.includes(id)),
    onlyAfter: b.filter((id) => !a.includes(id)),
  };
}

function usesInteractions(group) {
  return (group.checkInMode ?? "names_and_interactions") === "names_and_interactions";
}
