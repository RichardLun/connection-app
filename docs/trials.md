# Using Connected in a trial

This is how Connected works for future trials with schools or youth
organizations, following Irene's "Next Steps for Tool" doc. It covers what a
partner chooses, what kids see, what the report shows, and what is still
missing before real kids use it.

## 1. What the partner chooses when adding a group

| Choice | Options | Why |
|---|---|---|
| How they use Connected | **A group that meets regularly** (several sessions, compare them) or **a single activity** (one check-in and one report, no repeats or comparisons) | Some partners only want to try one activity |
| What kids can be asked | **Names, and who worked or talked with whom** (the network picture); **names, survey questions only**; or **no names, survey questions only** | Some partners can't collect names, or can't ask kids about each other |
| Reports | **Group-only** (the default) or **group reports plus leader support** | See section 4 |

The settings show at the top of the group screen. Group type and check-in
mode can't change once a group exists, because answers collected one way
can't be compared with answers collected another way.

## 2. Starting a session or activity

The start form asks for:

- **Date, activity type and a note**, as before.
- **Activity goal** (optional): what kids should be able to identify or do
  afterwards, written so it can be checked. For example: "Kids will identify
  one way to help a new participant join a group."
- **Learning question** (optional): shown to kids at check-in. For example:
  "A new student hasn't joined your group's activity yet. What could you do
  to help them take part?" Answers are kept in their own table and shown in
  their own section, never mixed with belonging or interaction. It can be
  changed on the session screen until the first kid checks in.
- **When kids check in**: right after the activity, at the end of the
  session, or later.
- **Questions**: tick which to ask. Every question shows its kind and whether
  it's research-tested (`docs/question-labels.md`). Groups asking who worked
  or talked with whom always get those two. For a group that meets regularly,
  the questions and timing start as the last session's, so sessions stay
  comparable. Changing them is allowed, and the compare screen will say so.

## 3. What kids see

- **Named groups**: tap your name, then one question at a time.
- **Groups without names**: tap Start, then the questions. The leader types
  how many took part on the session screen, so the report can say how many
  answered out of how many attended.
- **"Who" questions** have a **Nobody** button. Moving on without picking
  anyone is a skip. A skip stays blank: it's never turned into "no" or
  "nobody", and a skipped rating is never counted as 0.
- Every question can be skipped.
- A check-in saves all at once (one database call), so a dropped connection
  can't leave half a check-in behind. Checking in again replaces the earlier
  answers for that session.

## 4. Group-only reports and leader support

Irene's doc asks to fix the conflict between promising kids group-only
reports and pointing out individual kids who might need support. Connected
now makes it an explicit setting:

| | Group-only (default for new groups) | Leader support |
|---|---|---|
| Results picture | Dots and lines, no names, arranged so the order says nothing about who is who | Names on the dots |
| "Who to check on" list | Never shown | On the leader's results screen only |
| Group report, CSV export | No names, no ids, no flags | No names, no ids, no flags |
| AI overview | Group-level numbers only, and told not to suggest singling out kids | Group-level numbers only |
| Gephi export | Numbered kids, no status | Numbered kids with each one's status (connected / no reported connections / unknown) |

- Leader support needs names and the who-questions, so survey-only groups
  are always group-only.
- A group can switch to group-only at any time. It can only switch to leader
  support before anyone has checked in, so a promise made to kids is never
  broken afterwards.
- Groups made before November 2026 kept leader support, which is how they
  already worked. All of them are test groups.
- Tell kids (and parents, if needed) which one the group uses before they
  check in.

## 5. The group report

Each session or activity has a **Group report** (from the session screen or
the results screen). It reports only what was actually collected:

- The group, activity, date, goal, check-in timing, when the check-ins were
  answered, and every question asked with its kind.
- How many attended, how many checked in, and how many didn't.
- For every question: how many answered and how many skipped. For the "who"
  questions: how many named someone, said nobody, or skipped. Older
  check-ins show "not recorded" because they didn't tell nobody and skip apart.
- One section per kind: belonging, interaction, learning, activity feedback,
  and context. Ratings show their average (skips left out), scale and how
  many picked each option. The interaction section has the network numbers
  and a picture without names, when the who-questions were asked. Otherwise
  it says: "Belonging answers alone can't show who is connected to whom."
- Learning answers are listed without names, in alphabetical order.
- **Staff notes**: "What will we try next?" and, later, "How did it go?",
  saved with the session. For example, if kids want clearer instructions,
  staff might demonstrate the activity first next time, then ask for
  feedback afterwards.
- **Download CSV**: one row per number (`section, kind, question_id,
  question, measure, value`): group-level numbers and the staff notes only.
  No names, ids, individual answers or learning-answer text. Text that a
  spreadsheet could run as a formula gets a `'` in front.
- **Download GEXF**: the network for Gephi, one kind of connection per file
  (see `docs/reference-comparison.md`).
- **Print or save as PDF**: a clean page without buttons.

## 6. Comparing sessions

For groups that meet regularly, the compare screen shows:

- Who came and who answered each time, and how many checked in both times.
- For every rating question, on its own row: the average for everyone who
  answered each time (with how many), and the average for kids who answered
  both times (before, after, change, how many).
- Warnings when different kids answered ("an average for everyone can change
  even if nobody feels any different"), when the sessions asked different
  questions, or when kids checked in at a different time.
- Groups without names can't match kids up, so the compare screen says so
  and shows only everyone's averages.
- The network part (pictures, new and lost connections) only when both
  sessions asked the who-questions.

## 7. What's not built yet, on purpose

- **Data import.** The doc says to build an import only after a partner agrees
  to share suitable data, so there isn't one yet.
- **A younger-child version** of the circles question: it needs the survey
  draft's exact wording (`docs/survey-comparison.md`).
- **Bloom's taxonomy dashboard**: not needed (the doc says so). There's one
  goal and one learning question per activity.
- **The Anderson-Butcher and Conroy Belonging Scale**: only if it fits a
  partner better than the current questions.

## 8. Before real kids use it

- **Lock down the database.** Every table still uses the "Open for now"
  policies from the first migration: anyone with the app's public key can
  read and change every group. Real data needs leader accounts and policies
  that only let a leader see their own groups (and kids only add their own
  check-in). This is the most important thing left.
- Agree the question list, answer options and timing with the partner, and
  apply them in `core/questions.js` (`docs/survey-comparison.md`).
- Agree what the partner can collect and share, and whether summaries can be
  used in a paper or presentation.
- Decide group-only or leader support, and tell kids.
