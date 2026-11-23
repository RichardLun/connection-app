// A small made-up group where every result was worked out by hand, to check
// the rules from the next-steps doc: skipping isn't the same as "Nobody",
// results stay separate by kind, and comparisons show who answered.
// The hand calculations are in the comments, and tests/next-steps.test.js
// checks Connected gets the same answers.
//
// Session 1: six kids here (k6 never checks in). Ticks: Ana -> Ben (worked
// and talked), Ana -> Cy (talked).
//   Links: Ana-Ben, Ana-Cy = 2. Pairs possible: 6 * 5 / 2 = 15. Density 2/15.
//   Degrees: Ana 2, Ben 1, Cy 1, Dee 0, Eve 0, Finn 0.
//   Centralization: (0 + 1 + 1 + 2 + 2 + 2) / (5 * 4) = 8/20 = 0.4.
//   Average links: 2 * 2 / 6 = 2/3.
//   Status: Ana, Ben, Cy connected (Cy skipped, but Ana named Cy).
//     Dee said Nobody twice and nobody named Dee: no reported connections.
//     Eve skipped "worked with": unknown, even though Eve answered a rating
//     (the old rule would have called Eve isolated). Finn: no check-in, unknown.
//   Closeness (circles): 6, 5, 2, 4 -> 17/4 = 4.25 from 4 answers, 1 skipped (Cy).
//   Identification: 5, 7 -> 6 from 2 answers, 3 skipped.
//   Worked with: named 1 (Ana), nobody 2 (Ben, Dee), skipped 2 (Cy, Eve).
//   Talked to: named 1 (Ana), nobody 3 (Ben, Dee, Eve), skipped 1 (Cy).
//   Learning: 2 answers, 3 skipped. Easier next time: 3 answered, 2 skipped;
//     more time 2, clearer instructions 1, nothing 1.
//
// Session 2: five here (Finn away). Check-ins from Ana, Ben and Cy only.
//   Ticks: Ana -> Ben (worked).
//   Closeness: everyone 7, 5, 3 -> 5 (3 answers). Paired (here both times and
//     answered both times): Ana 6 -> 7, Ben 5 -> 5: 5.5 -> 6, +0.5 from 2 kids.
//   Identification: everyone 6 (Ana), 4 (Cy) -> 5 (2 answers). Paired: only
//     Ana, 5 -> 6, +1. So the everyone average fell (6 -> 5) while the one kid
//     who answered both times rose: a different set of kids answered.
//   Checked in both times: Ana, Ben, Cy = 3. Only session 1: Dee, Eve = 2.
//   Different questions (session 2 dropped new partner and easier next
//   time) and different timing.
export function knownAnswerGroup() {
  const named = (worked, talked, extra = {}) => ({
    stayedWhole: "",
    firstTime: "",
    q4: null,
    q5: null,
    identification: null,
    feltIncluded: null,
    newPartner: null,
    easierNextTime: null,
    workedWithStatus: worked,
    talkedToStatus: talked,
    knewBeforeStatus: null,
    ...extra,
  });
  return {
    id: "g-known",
    name: "Known answer",
    groupType: "regular",
    checkInMode: "names_and_interactions",
    reportPrivacy: "leader_support",
    people: [
      { id: "k1", name: "Ana" },
      { id: "k2", name: "Ben" },
      { id: "k3", name: "Cy" },
      { id: "k4", name: "Dee" },
      { id: "k5", name: "Eve" },
      { id: "k6", name: "Finn" },
    ],
    sessions: [
      {
        id: "ks1",
        number: 1,
        date: "2026-11-02",
        activityType: "small_groups_leader_chose",
        activityGoal: "Kids can name one way to help a new kid join in.",
        learningQuestion: "A new student hasn't joined your group's activity yet. What could you do to help them take part?",
        questions: ["worked_with", "talked_to", "iis_circles", "identification", "new_partner", "easier_next_time"],
        checkInTiming: "end_of_session",
        tryNext: "=Demonstrate the activity first",
        howItWent: null,
        present: ["k1", "k2", "k3", "k4", "k5", "k6"],
        answers: [
          { personId: "k1", answeredAt: "2026-11-02T16:05:00Z", ...named("named", "named", { q4: 6, identification: 5, newPartner: "yes", easierNextTime: ["more_time"] }) },
          { personId: "k2", answeredAt: "2026-11-02T16:01:00Z", ...named("none", "none", { q4: 5, identification: 7, newPartner: "no_opportunity", easierNextTime: ["nothing"] }) },
          { personId: "k3", answeredAt: "2026-11-02T16:02:00Z", ...named("skipped", "skipped") },
          { personId: "k4", answeredAt: "2026-11-02T16:03:00Z", ...named("none", "none", { q4: 2, easierNextTime: ["clearer_instructions", "more_time"] }) },
          { personId: "k5", answeredAt: "2026-11-02T16:04:00Z", ...named("skipped", "none", { q4: 4, newPartner: "no" }) },
        ],
        ticks: [
          { from: "k1", to: "k2", workedWith: true, talkedTo: true, knewBefore: false },
          { from: "k1", to: "k3", workedWith: false, talkedTo: true, knewBefore: false },
        ],
        learningAnswers: [
          { personId: "k1", answer: "Invite them to join without pressure", answeredAt: "2026-11-02T16:05:00Z" },
          { personId: "k4", answer: "Explain the activity", answeredAt: "2026-11-02T16:03:00Z" },
        ],
        anonymousAnswers: [],
      },
      {
        id: "ks2",
        number: 2,
        date: "2026-11-09",
        activityType: "whole_group_game",
        activityGoal: null,
        learningQuestion: null,
        questions: ["worked_with", "talked_to", "iis_circles", "identification"],
        checkInTiming: "right_after_activity",
        tryNext: null,
        howItWent: null,
        present: ["k1", "k2", "k3", "k4", "k5"],
        answers: [
          { personId: "k1", answeredAt: "2026-11-09T16:00:00Z", ...named("named", "none", { q4: 7, identification: 6 }) },
          { personId: "k2", answeredAt: "2026-11-09T16:01:00Z", ...named("none", "none", { q4: 5 }) },
          { personId: "k3", answeredAt: "2026-11-09T16:02:00Z", ...named("none", "none", { q4: 3, identification: 4 }) },
        ],
        ticks: [{ from: "k1", to: "k2", workedWith: true, talkedTo: false, knewBefore: false }],
        learningAnswers: [],
        anonymousAnswers: [],
      },
    ],
  };
}

// A single activity run without names: 10 took part, 3 checked in.
export function anonymousActivity() {
  const answer = (extra) => ({
    q4: null, q5: null, identification: null, feltIncluded: null, newPartner: null,
    easierNextTime: null, stayedWhole: "", firstTime: "", answeredAt: "2026-11-20T10:00:00Z", ...extra,
  });
  return {
    id: "g-anon",
    name: "Anonymous activity",
    groupType: "single_activity",
    checkInMode: "anonymous_survey",
    reportPrivacy: "group_only",
    people: [],
    sessions: [
      {
        id: "as1",
        number: 1,
        date: "2026-11-20",
        activityType: "pairs",
        activityGoal: null,
        learningQuestion: null,
        questions: ["felt_included", "new_partner", "easier_next_time"],
        checkInTiming: "right_after_activity",
        attendedCount: 10,
        present: [],
        answers: [],
        ticks: [],
        learningAnswers: [],
        anonymousAnswers: [
          { id: "r1", ...answer({ feltIncluded: 4, newPartner: "yes", easierNextTime: ["smaller_groups"] }) },
          { id: "r2", ...answer({ feltIncluded: 5, newPartner: "no_opportunity" }) },
          { id: "r3", ...answer({}) },
        ],
      },
    ],
  };
}
