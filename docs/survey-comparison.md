# The live tool compared with the survey draft

Irene's next-steps doc asks Richard to compare the live tool with the survey
draft and flag every difference, then use the agreed wording, answer
options, scoring and timing once the question list for a trial is agreed.

**The survey draft itself isn't in this repository.** This compares the live
tool (as it was before November 2026, and as it is now) with what the
next-steps doc says about the draft. Rows marked **Check** need the draft's
exact text. When the wording is agreed, change it in one place,
`core/questions.js`, following the rules in `docs/question-labels.md`.

## Differences

| # | What | Live tool before November 2026 | Survey draft (from the next-steps doc) | Now | Status |
|---|---|---|---|---|---|
| 1 | Identification item | Q5: "How much do you feel you belong in this group?", 1 Not at all to 5 Very much | Teen Q5: "I identify with this group", Postmes, Haslam & Jans (2013), agreement from 1 to 7 | New sessions ask "I identify with this group." from 1 Strongly disagree to 7 Strongly agree, saved in its own column. Old Q5 answers stay labelled as the first-version 1-to-5 belonging question and are never averaged or compared with identification | **Fixed** (different wording, construct and scale). **Check** the draft's label for each point: Connected labels all seven, from Strongly disagree to Strongly agree |
| 2 | Overlapping circles (IIS) | Q4: "Which picture best shows how close you feel to this group?" Hint: "The blue circle is you. The orange circle is the group." 7 pictures, scored 1 to 7 | Teen Q4: IIS, Tropp & Wright (2001), choose a picture | Unchanged | Same scoring. **Check** the picture against the draft's: the published IIS writes "self" and the group's name in the circles; Connected uses colours and a hint instead. Check the wording, and whether picture 1 should touch or have a gap (Connected's has a small gap) |
| 3 | Younger children | One version for every age | Younger-child Q3: the circles with simpler wording; no identification item | Not added yet. Leaders can untick identification for a younger group | **Check**: needs the draft's Q3 wording. Add it as a new question (`iis_circles_young`) rather than editing `iis_circles` |
| 4 | Identification for younger children | Q5 asked of everyone | Teen only | A leader choice when starting a session; no automatic age rule | **Check** whether trials should set it by age |
| 5 | Check-in timing | Not recorded. The guides say "at the end of each session" | To be agreed with GFM ("activity, ages and survey timing") | Recorded for every session: right after the activity, at the end of the session, or later. Defaults to the last session's timing; compare warns when it differs | **Agree** the timing for each trial and keep it the same |
| 6 | "Who" questions: nobody vs skipped | Tapping nobody and pressing Next looked the same as skipping | Paper roster: a blank roster can't be told apart from skipping either | An explicit **Nobody** button. Moving on without a pick is a skip and stays blank. The report counts named, nobody and skipped | **Fixed** (next-steps doc, item 2 and 7) |
| 7 | No connections vs unknown | A kid with no links who answered Q4 or Q5 counted as having no connections, even if they skipped the who-questions | Skipped answers should stay blank, not count as "none" | Only a kid who answered the who-questions (names or Nobody) and has no links counts as "no reported connections". Skipped, absent or no check-in is "unknown". Older check-ins keep the old rule | **Fixed** |
| 8 | Who they knew before | Asked at a kid's first check-in | Not mentioned | Unchanged, labelled context with an unclear purpose | **Check** whether the draft has it |
| 9 | Stayed for the whole session, first time here | Asked every time, yes/no | Not mentioned | Optional. Ticked by default only for groups that already asked them | **Check** whether the draft has them |
| 10 | "During today's activity, I felt included." | Not asked | Possible GFM question; answer options not given | Optional, 1 Strongly disagree to 5 Strongly agree | **Agree** the answer options with GFM |
| 11 | "Did you work with someone you hadn't worked with before?" | Not asked | Possible GFM question, with "There wasn't an opportunity to" | Optional: Yes / No / There wasn't an opportunity to | Matches the doc |
| 12 | "What would make it easier to take part next time?" | Not asked | Possible GFM question, examples: smaller groups, clearer instructions, more time, another way to participate, nothing needs to change | Optional, pick all that fit. "Another way to participate" reads "Another way to take part", to match the question | **Agree** the exact options with GFM |
| 13 | Learning question | Not asked | One question from the activity's goal (Bloom's taxonomy), answers kept apart | Optional activity goal and learning question per session; free-text answers in their own table and report section | Added (next-steps doc, item 3) |
| 14 | Unknown label on results | "Didn't check in", even for kids who returned a blank check-in | n/a | "Not known: skipped the who-questions or didn't check in" | **Fixed** |
| 15 | Results wording | "Kids with no connections"; the compare warning said kids "were isolated" | Avoid labelling kids | "Answered, but no reported connections"; "had no reported connections in both sessions" | **Fixed** |

## Scoring rules (unchanged, now in one place)

- Ratings are averaged over the kids who answered. A skipped rating is blank,
  never 0, so it can't pull an average down.
- Each rating question has its own average and scale. Nothing adds them up.
- Comparisons pair kids who were at both sessions and answered that question
  both times, and also show everyone's average with how many answered.
- Q5 (1 to 5) and identification (1 to 7) are different questions, so a
  comparison where one session asked Q5 and the other asked identification
  says each was "asked only once" instead of comparing them.

## Before a trial

1. Paste the survey draft's exact wording for teen Q4, teen Q5 and
   younger-child Q3 into this file and check rows 1 to 4.
2. Agree with the partner which questions to ask, their answer options, and
   when kids answer (rows 5, 10 and 12).
3. Change `core/questions.js` once, with new ids for any changed question, and
   run `npm test`.
