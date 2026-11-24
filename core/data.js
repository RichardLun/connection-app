// Saving to and loading from the database.
// Supabase returns { data, error } instead of throwing, so every function
// checks error itself. Otherwise a failed save would look like it worked.
import { supabase } from "../lib/supabase.js";

// groupType, checkInMode and reportPrivacy use the values in core/settings.js.
// Left out, it's a regular group with names and interactions, and group-only
// reports. Group-only is set here because the database default is leader
// support, which the live site's older group screen relies on.
export async function createGroup(name, { ageRange, programType, groupType, checkInMode, reportPrivacy = "group_only" } = {}) {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      age_range: ageRange,
      program_type: programType,
      group_type: groupType,
      check_in_mode: checkInMode,
      report_privacy: reportPrivacy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listGroups() {
  const { data, error } = await supabase
    .from("groups")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// The screens check canSwitchPrivacy() from core/settings.js first.
export async function setReportPrivacy(groupId, reportPrivacy) {
  const { error } = await supabase.from("groups").update({ report_privacy: reportPrivacy }).eq("id", groupId);
  if (error) throw error;
}

export async function addPerson(groupId, name) {
  const { data, error } = await supabase
    .from("people")
    .insert({ group_id: groupId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renamePerson(personId, name) {
  const { data, error } = await supabase
    .from("people")
    .update({ name })
    .eq("id", personId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePerson(personId) {
  // The database deletes a kid's attendance, answers and ticks along with
  // the kid, without asking. So check first that there's nothing to lose.
  // head: true asks only for the count, not the rows themselves.
  const checks = await Promise.all([
    supabase.from("attendance").select("*", { count: "exact", head: true }).eq("person_id", personId),
    supabase.from("answers").select("*", { count: "exact", head: true }).eq("person_id", personId),
    supabase.from("ticks").select("*", { count: "exact", head: true })
      .or(`from_person.eq.${personId},to_person.eq.${personId}`),
  ]);
  for (const { count, error } of checks) {
    if (error) throw error;
    if (count > 0) {
      throw new Error("This kid can't be removed because they have attendance, answers or ticks saved in a session. Removing them would delete that too.");
    }
  }

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", personId);
  if (error) throw error;
}

export async function listPeople(groupId) {
  const { data, error } = await supabase
    .from("people")
    .select()
    .eq("group_id", groupId)
    .order("name");
  if (error) throw error;
  return data;
}

// questions is the list of question ids from core/questions.js. Left out,
// the session asks the original Connected questions.
export async function startSession(groupId, {
  date, activityType, activityNote, activityGoal, learningQuestion, questions, checkInTiming,
} = {}) {
  const { data: last, error: findError } = await supabase
    .from("sessions")
    .select("number")
    .eq("group_id", groupId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  // If two sessions start at the same moment they could pick the same number.
  // The table allows each number once per group, so the second one fails
  // instead of making a duplicate.
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      group_id: groupId,
      number: (last?.number ?? 0) + 1,
      date,
      activity_type: activityType,
      activity_note: activityNote,
      activity_goal: activityGoal,
      learning_question: learningQuestion,
      questions,
      check_in_timing: checkInTiming,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setPresent(sessionId, personIds) {
  const { data: rows, error: readError } = await supabase
    .from("attendance")
    .select("person_id")
    .eq("session_id", sessionId);
  if (readError) throw readError;

  const current = rows.map((row) => row.person_id);
  const toAdd = personIds.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !personIds.includes(id));

  // Add before removing, so if the connection drops halfway we end up with
  // an extra kid listed rather than a missing one.
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("attendance")
      .insert(toAdd.map((personId) => ({ session_id: sessionId, person_id: personId })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("session_id", sessionId)
      .in("person_id", toRemove);
    if (error) throw error;
  }
}

// Only the fields given are changed: activityGoal, learningQuestion,
// attendedCount (for groups without names), tryNext and howItWent. The
// database refuses a new learningQuestion once anyone has checked in.
export async function updateSession(sessionId, changes) {
  const columns = {
    activityGoal: "activity_goal",
    learningQuestion: "learning_question",
    attendedCount: "attended_count",
    tryNext: "try_next",
    howItWent: "how_it_went",
  };
  const row = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!columns[key]) throw new Error(`Can't change ${key}`);
    row[columns[key]] = value;
  }
  if ("tryNext" in changes || "howItWent" in changes) row.notes_updated_at = new Date().toISOString();
  const { error } = await supabase.from("sessions").update(row).eq("id", sessionId);
  if (error) throw error;
}

// The answers both kinds of check-in share, as the database names them.
// Missing values are sent as null or "", so checking in again replaces the
// earlier answers instead of keeping some of them.
function answerRow(answers) {
  return {
    q4: answers.q4 ?? null,
    q5: answers.q5 ?? null,
    identification: answers.identification ?? null,
    felt_included: answers.feltIncluded ?? null,
    new_partner: answers.newPartner ?? null,
    easier_next_time: answers.easierNextTime?.length ? answers.easierNextTime : null,
    stayed_whole: answers.stayedWhole ?? "",
    first_time: answers.firstTime ?? "",
  };
}

// Saves one kid's check-in in a single database call (save_check_in in
// supabase/migrations/), so it's all saved or, if anything fails, none of it
// is and the kid can try again. The statuses say how each "who" question was
// answered: "named", "none" (tapped Nobody), "skipped", or null if it wasn't
// asked this time.
export async function saveCheckIn(sessionId, {
  personId, workedWith = [], talkedTo = [], knewBefore = [],
  workedWithStatus = null, talkedToStatus = null, knewBeforeStatus = null,
  learningAnswer = null, ...answers
}) {
  const tapped = [...new Set([...workedWith, ...talkedTo, ...knewBefore])];
  const { error } = await supabase.rpc("save_check_in", {
    p_session_id: sessionId,
    p_person_id: personId,
    p_answer: {
      ...answerRow(answers),
      worked_with_status: workedWithStatus,
      talked_to_status: talkedToStatus,
      knew_before_status: knewBeforeStatus,
    },
    p_ticks: tapped.map((id) => ({
      to_person: id,
      worked_with: workedWith.includes(id),
      talked_to: talkedTo.includes(id),
      knew_before: knewBefore.includes(id),
    })),
    p_learning_answer: learningAnswer,
  });
  if (error) throw error;
}

// The same for a group that checks in without names. responseId comes from
// crypto.randomUUID() on the check-in screen, so trying again after a
// dropped connection updates the same check-in instead of adding another.
export async function saveAnonymousCheckIn(sessionId, responseId, { learningAnswer = null, ...answers }) {
  const { error } = await supabase.rpc("save_anonymous_check_in", {
    p_session_id: sessionId,
    p_response_id: responseId,
    p_answer: answerRow(answers),
    p_learning_answer: learningAnswer,
  });
  if (error) throw error;
}

// Fetches one table's rows for many sessions in a single request, instead of
// one request per session.
async function rowsForSessions(table, sessionIds) {
  // A group with no sessions yet has nothing to fetch.
  if (sessionIds.length === 0) return [];
  const { data, error } = await supabase
    .from(table)
    .select()
    .in("session_id", sessionIds);
  if (error) throw error;
  return data;
}

export async function loadGroup(groupId) {
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select()
    .eq("id", groupId)
    .single();
  if (groupError) throw groupError;

  const people = await listPeople(groupId);

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select()
    .eq("group_id", groupId)
    .order("number");
  if (sessionsError) throw sessionsError;

  // Fetched side by side rather than one after another, so a slow
  // connection waits for one round trip instead of five.
  const sessionIds = sessions.map((session) => session.id);
  const [attendance, answers, ticks, anonymousAnswers, learningAnswers] = await Promise.all(
    ["attendance", "answers", "ticks", "anonymous_answers", "learning_answers"]
      .map((table) => rowsForSessions(table, sessionIds)),
  );
  const shared = (row) => ({
    q4: row.q4,
    q5: row.q5,
    identification: row.identification,
    feltIncluded: row.felt_included,
    newPartner: row.new_partner,
    easierNextTime: row.easier_next_time,
    stayedWhole: row.stayed_whole,
    firstTime: row.first_time,
    // Older check-ins only have the time they were first saved.
    answeredAt: row.answered_at ?? row.created_at,
  });

  // The calculations use the names from "The group object" in the build
  // steps, so they never need to know the database's column names.
  return {
    id: group.id,
    name: group.name,
    ageRange: group.age_range,
    programType: group.program_type,
    groupType: group.group_type,
    checkInMode: group.check_in_mode,
    reportPrivacy: group.report_privacy,
    people: people.map((person) => ({ id: person.id, name: person.name })),
    sessions: sessions.map((session) => ({
      id: session.id,
      number: session.number,
      date: session.date,
      activityType: session.activity_type,
      activityNote: session.activity_note,
      activityGoal: session.activity_goal,
      learningQuestion: session.learning_question,
      questions: session.questions,
      checkInTiming: session.check_in_timing,
      attendedCount: session.attended_count,
      tryNext: session.try_next,
      howItWent: session.how_it_went,
      notesUpdatedAt: session.notes_updated_at,
      present: attendance
        .filter((row) => row.session_id === session.id)
        .map((row) => row.person_id),
      answers: answers
        .filter((row) => row.session_id === session.id)
        .map((row) => ({
          personId: row.person_id,
          ...shared(row),
          workedWithStatus: row.worked_with_status,
          talkedToStatus: row.talked_to_status,
          knewBeforeStatus: row.knew_before_status,
        })),
      anonymousAnswers: anonymousAnswers
        .filter((row) => row.session_id === session.id)
        .map((row) => ({ id: row.id, ...shared(row) })),
      learningAnswers: learningAnswers
        .filter((row) => row.session_id === session.id)
        .map((row) => ({
          personId: row.person_id,
          question: row.question,
          answer: row.answer,
          answeredAt: row.answered_at,
        })),
      ticks: ticks
        .filter((row) => row.session_id === session.id)
        .map((row) => ({
          from: row.from_person,
          to: row.to_person,
          workedWith: row.worked_with,
          talkedTo: row.talked_to,
          knewBefore: row.knew_before,
        })),
    })),
  };
}
