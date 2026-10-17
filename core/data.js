// Saving to and loading from the database.
// Supabase returns { data, error } instead of throwing, so every function
// checks error itself. Otherwise a failed save would look like it worked.
import { supabase } from "../lib/supabase.js";

export async function createGroup(name, { ageRange, programType } = {}) {
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, age_range: ageRange, program_type: programType })
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

export async function addPerson(groupId, name) {
  const { data, error } = await supabase
    .from("people")
    .insert({ group_id: groupId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function startSession(groupId, { date, activityType, activityNote } = {}) {
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

export async function saveCheckIn(sessionId, {
  personId, workedWith, talkedTo, knewBefore = [], q4, q5, stayedWhole, firstTime,
}) {
  const tapped = [...new Set([...workedWith, ...talkedTo, ...knewBefore])];
  const ticks = tapped.map((id) => ({
    session_id: sessionId,
    from_person: personId,
    to_person: id,
    worked_with: workedWith.includes(id),
    talked_to: talkedTo.includes(id),
    knew_before: knewBefore.includes(id),
  }));

  const { data: rows, error: readError } = await supabase
    .from("ticks")
    .select("to_person")
    .eq("session_id", sessionId)
    .eq("from_person", personId);
  if (readError) throw readError;
  const toRemove = rows.map((row) => row.to_person).filter((id) => !tapped.includes(id));

  // Upsert so a second check-in updates the old ticks instead of adding
  // copies. Save before removing, for the same reason as in setPresent.
  if (ticks.length > 0) {
    const { error } = await supabase
      .from("ticks")
      .upsert(ticks, { onConflict: "session_id,from_person,to_person" });
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("ticks")
      .delete()
      .eq("session_id", sessionId)
      .eq("from_person", personId)
      .in("to_person", toRemove);
    if (error) throw error;
  }

  // Saved last, so an answer row means the whole check-in made it.
  // Missing values must be sent as null or "", because an upsert leaves out
  // undefined fields and would keep the old check-in's value.
  // created_at isn't sent, so it keeps the time of the first check-in.
  const { error } = await supabase
    .from("answers")
    .upsert(
      {
        session_id: sessionId,
        person_id: personId,
        q4: q4 ?? null,
        q5: q5 ?? null,
        stayed_whole: stayedWhole ?? "",
        first_time: firstTime ?? "",
      },
      { onConflict: "session_id,person_id" },
    );
  if (error) throw error;
}
