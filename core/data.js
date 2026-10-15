// Saving to and loading from the database.
// Supabase returns { data, error } instead of throwing, so every function
// checks error itself. Otherwise a failed save would look like it worked.
import { supabase } from "../lib/supabase.js";

export async function createGroup(name, { ageRange, programType }) {
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
