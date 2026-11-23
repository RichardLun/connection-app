// How a group uses Connected: the choices a leader makes when adding a
// group, and the rules that follow from them. docs/trials.md explains them.
// This file must not import from lib/ or core/data.js, so Node can test it.

export const GROUP_TYPES = [
  { value: "regular", label: "A group that meets regularly", hint: "Several sessions, which you can compare." },
  { value: "single_activity", label: "A single activity", hint: "One check-in and one report, with no repeat sessions." },
];

export const CHECK_IN_MODES = [
  {
    value: "names_and_interactions",
    label: "Names, and who worked or talked with whom",
    hint: "Kids tap their name and the names of kids they worked with or talked to. Gives the network picture.",
  },
  {
    value: "names_survey",
    label: "Names, survey questions only",
    hint: "Kids tap their name, then answer questions. No one is asked about other kids, so there is no network.",
  },
  {
    value: "anonymous_survey",
    label: "No names, survey questions only",
    hint: "Kids just answer the questions. For partners who can't collect names. You enter how many took part.",
  },
];

export const REPORT_PRIVACY = [
  {
    value: "group_only",
    label: "Group-only reports",
    hint: "Results are about the group as a whole. No screen names or flags a kid.",
  },
  {
    value: "leader_support",
    label: "Group reports, plus support for the leader",
    hint: "The leader's results screen also names kids who might need a check-in. Exports never include names.",
  },
];

export const CHECK_IN_TIMINGS = [
  { value: "right_after_activity", label: "Right after the activity" },
  { value: "end_of_session", label: "At the end of the session" },
  { value: "later_day", label: "Later (the same day or another day)" },
];

export function isSingleActivity(group) {
  return group.groupType === "single_activity";
}

export function usesNames(group) {
  return group.checkInMode !== "anonymous_survey";
}

export function asksInteractions(group) {
  return (group.checkInMode ?? "names_and_interactions") === "names_and_interactions";
}

// Only a group that chose leader support, and asks who kids connected with,
// ever shows a kid's name next to a result. Anything else, including a group
// object without the setting, stays group-only.
export function showsIndividuals(group) {
  return group.reportPrivacy === "leader_support" && asksInteractions(group);
}

// Going back to group-only is always allowed. Going the other way would break
// a promise made to kids who already checked in, so only before anyone has.
export function canSwitchPrivacy(group, to) {
  if (to === "group_only") return true;
  if (!asksInteractions(group)) return false;
  return group.sessions.every((s) => s.answers.length === 0 && (s.anonymousAnswers ?? []).length === 0);
}

// "Session" for groups that meet regularly, "activity" for a single one.
export function sessionWord(group) {
  return isSingleActivity(group) ? "Activity" : "Session";
}

export function optionLabel(list, value) {
  return list.find((item) => item.value === value)?.label ?? "";
}
