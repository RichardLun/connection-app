// The tiny example from "The group object" in docs/build-steps.md.
// It's a function rather than a shared object so each test gets its own
// copy, and a test that changes it can't break another test.
export function tinyGroup() {
  return {
    id: "g1",
    name: "Tiny example",
    ageRange: "11-13",
    programType: "after_school",
    people: [
      { id: "p1", name: "Ana" },
      { id: "p2", name: "Ben" },
      { id: "p3", name: "Cara" },
      { id: "p4", name: "Dev" },
      { id: "p5", name: "Eli" },
      { id: "p6", name: "Fay" },
    ],
    sessions: [
      {
        id: "s1",
        number: 1,
        date: "2026-10-14",
        activityType: "small_groups_leader_chose",
        activityNote: null,
        present: ["p1", "p2", "p3", "p4", "p5", "p6"],
        // Fay (p6) never checked in, so she has no answer.
        answers: [
          { personId: "p1", q4: 5, q5: 4, stayedWhole: "", firstTime: "" },
          { personId: "p2", q4: 4, q5: 3, stayedWhole: "", firstTime: "" },
          { personId: "p3", q4: 6, q5: 5, stayedWhole: "", firstTime: "" },
          { personId: "p4", q4: null, q5: null, stayedWhole: "", firstTime: "" },
          { personId: "p5", q4: 3, q5: 2, stayedWhole: "", firstTime: "" },
        ],
        ticks: [
          { from: "p1", to: "p2", workedWith: true, talkedTo: false, knewBefore: false },
          { from: "p1", to: "p3", workedWith: true, talkedTo: true, knewBefore: false },
          { from: "p2", to: "p1", workedWith: false, talkedTo: true, knewBefore: false },
          { from: "p3", to: "p4", workedWith: false, talkedTo: true, knewBefore: false },
        ],
      },
    ],
  };
}
