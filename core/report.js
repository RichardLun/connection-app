// The group report for one session or activity: what was asked, who
// answered, and the results for each kind of question, kept apart. It holds
// group-level numbers only, never names or ids, so the report screen and
// the CSV export can both use it. docs/trials.md explains it.
// This file must not import from lib/ or core/data.js, so Node can test it.
import { sessionNumbers, average } from "./numbers.js";
import { KINDS, sessionQuestions, hasNetwork } from "./questions.js";
import { checkIns, attendedCount, learningAnswers } from "./responses.js";
import { asksInteractions, isSingleActivity, sessionWord } from "./settings.js";
import { RELATIONS } from "./network.js";

// The order sections appear in. Each kind gets its own section.
export const SECTION_ORDER = ["belonging", "interaction", "learning", "feedback", "context"];

export const NO_NETWORK_NOTE =
  "This check-in didn't ask who kids worked with or talked to, so there is no network. " +
  "Belonging answers alone can't show who is connected to whom.";

export function sessionReport(group, sessionNumber) {
  const session = group.sessions.find((s) => s.number === sessionNumber);
  if (!session) throw new Error(`This group has no session ${sessionNumber}`);
  const responses = checkIns(group, session);
  const attended = attendedCount(group, session);
  const network = asksInteractions(group) && hasNetwork(session);
  const times = responses.map((answer) => answer.answeredAt).filter(Boolean).sort();

  const questions = sessionQuestions(session).map((question) => questionResult(question, responses, group, session));
  const sections = SECTION_ORDER
    .map((kind) => ({ kind, label: KINDS[kind].label, asks: KINDS[kind].asks, questions: questions.filter((q) => q.kind === kind) }))
    .filter((section) => section.questions.length > 0 || (section.kind === "interaction" && network));

  return {
    group: {
      name: group.name,
      type: isSingleActivity(group) ? "single_activity" : "regular",
      checkInMode: group.checkInMode ?? "names_and_interactions",
    },
    activity: {
      word: sessionWord(group),
      number: session.number,
      date: session.date ?? null,
      activityType: session.activityType ?? null,
      note: session.activityNote ?? null,
      goal: session.activityGoal ?? null,
      timing: session.checkInTiming ?? null,
      answeredFrom: times[0] ?? null,
      answeredTo: times.at(-1) ?? null,
      questionIds: questions.map((q) => q.id),
    },
    participation: {
      attended,
      checkedIn: responses.length,
      // Null when the leader hasn't said how many took part.
      notCheckedIn: attended === null ? null : Math.max(attended - responses.length, 0),
    },
    sections,
    network: network
      ? { relation: RELATIONS.either.label, numbers: sessionNumbers(group, sessionNumber) }
      : null,
    noNetworkNote: network ? null : NO_NETWORK_NOTE,
    notes: {
      tryNext: session.tryNext ?? null,
      howItWent: session.howItWent ?? null,
      updatedAt: session.notesUpdatedAt ?? null,
    },
  };
}

// One question's results. asked + skipped + notRecorded add up to the
// check-ins that were shown the question. A skip is never counted as "no"
// or "nobody", and never as 0 in an average.
function questionResult(question, responses, group, session) {
  const base = {
    id: question.id,
    kind: question.kind,
    label: question.label,
    wording: question.wording,
    source: question.source,
    researchTested: question.researchTested,
    purposeUnclear: Boolean(question.purposeUnclear),
    note: question.note,
  };

  if (question.type === "names") {
    let named = 0, none = 0, skipped = 0, notAsked = 0, notRecorded = 0;
    for (const answer of responses) {
      const status = answer[question.statusField];
      if (status === "named") named += 1;
      else if (status === "none") none += 1;
      else if (status === "skipped") skipped += 1;
      // A newer check-in that left this blank didn't ask it (knew before is
      // only asked once).
      else if (hasStatuses(answer)) notAsked += 1;
      // Older check-ins didn't record statuses, but their ticks still show who
      // named someone. For the rest, "nobody" and a skip look the same.
      else if (namedInTicks(session, answer.personId, question.field)) named += 1;
      else notRecorded += 1;
    }
    return { ...base, asked: named + none + skipped + notRecorded, answered: named + none, skipped, notRecorded, notAsked, named, none };
  }

  if (question.type === "text") {
    const answers = learningAnswers(group, session).map((row) => row.answer);
    return {
      ...base,
      asked: responses.length,
      answered: answers.length,
      skipped: responses.length - answers.length,
      // Sorted, so the order doesn't give away who checked in when.
      answers: [...answers].sort((a, b) => a.localeCompare(b)),
    };
  }

  const values = responses.map((answer) => answer[question.field]).filter((value) => isAnswer(value));
  const result = { ...base, asked: responses.length, answered: values.length, skipped: responses.length - values.length };
  const counts = (question.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
    count: values.filter((value) => (Array.isArray(value) ? value.includes(option.value) : value === option.value)).length,
  }));
  if (typeof question.min === "number") {
    return { ...result, min: question.min, max: question.max, average: average(values), counts };
  }
  return { ...result, multiple: question.type === "choices", counts };
}

function isAnswer(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== "";
}

function namedInTicks(session, personId, field) {
  return session.ticks.some((tick) => tick.from === personId && tick[field]);
}

function hasStatuses(answer) {
  return [answer.workedWithStatus, answer.talkedToStatus, answer.knewBeforeStatus].some((s) => s != null);
}
