# Question labels

Irene's next-steps doc asks that every question tells us one of three things,
and that results stay separate:

- **Interaction**: who talked or worked with whom during an activity.
- **Belonging**: whether kids felt accepted and included in the group.
- **Learning**: what kids can identify or do after the activity.

Talking to lots of people doesn't mean feeling included, and a quiet kid may
still feel they belong. So Connected never adds answers up into one
"connection score". Each result is shown on its own, with its kind, the group
or activity, and when it was answered.

Every question lives in `core/questions.js`, with its exact wording, answer
options, scoring, kind, source, and flags. The check-in screen, the results,
the report and the exports all read it from there.

## The questions

Two extra kinds cover questions that are none of the three:
**activity feedback** (helps staff improve the activity) and **context**
(background for reading the other answers). Both are flagged so nobody reads
them as interaction, belonging or learning results.

| id | Wording kids see | Answer | Kind | Source | Flags |
|---|---|---|---|---|---|
| `worked_with` | Who did you work with today? | Tap names, or Nobody, or skip | Interaction | Connected (paper roster sheet) | Builds the network |
| `talked_to` | Who did you talk to today? | Tap names, or Nobody, or skip | Interaction | Connected (paper roster sheet) | Builds the network |
| `new_partner` | Did you work with someone you hadn't worked with before? | Yes / No / There wasn't an opportunity to | Interaction | Next-steps doc, optional, not research-tested | A kid's own report; says nothing about who |
| `iis_circles` | Which picture best shows how close you feel to this group? | 7 pictures of two circles, apart (1) to almost overlapping (7) | Belonging | Inclusion of Ingroup in the Self (IIS), Tropp & Wright (2001) | Research-tested. Teen Q4 in the survey draft |
| `identification` | I identify with this group. | 1 Strongly disagree to 7 Strongly agree | Belonging | Single-item social identification, Postmes, Haslam & Jans (2013) | Research-tested. Teen Q5 in the survey draft; not asked of younger children there |
| `belong_5pt` | How much do you feel you belong in this group? | 1 Not at all to 5 Very much | Belonging | Connected's first version | **Retired.** Not a published measure, and not the draft's identification item. Kept so older sessions still show correctly |
| `felt_included` | During today's activity, I felt included. | 1 Strongly disagree to 5 Strongly agree | Belonging (activity experience) | Next-steps doc, optional, not research-tested | **Answer options are a placeholder** until GFM agrees on them |
| `learning` | Written by staff for each activity | Free text | Learning | Staff, from the activity goal (Bloom's taxonomy: something kids can show) | Answers shown on their own, never scored |
| `easier_next_time` | What would make it easier to take part next time? | Pick all that fit: Smaller groups, Clearer instructions, More time, Another way to take part, Nothing needs to change | Activity feedback | Next-steps doc, optional, not research-tested | For staff decisions, not a measure |
| `knew_before` | Who did you already know before you joined this group? | Tap names, or Nobody, or skip | Context | Connected | **Purpose unclear.** Prior relationship, not today's interaction. Only asked at a kid's first check-in; not used in any number |
| `stayed_whole` | Did you stay for the whole session? | Yes / No | Context | Connected (paper sheet) | **Purpose unclear.** Not used in any number |
| `first_time` | Was today your first time at this group? | Yes / No | Context | Connected (paper sheet) | **Purpose unclear.** Not used in any number |

### Questions whose purpose is unclear

- **Who they knew before**: it records friendships from before the group, which
  could show whether new connections are forming. Nothing uses it yet. Decide
  whether to keep asking it, and if so, report it as its own network
  (the report and Gephi export already keep it apart).
- **Stayed for the whole session** and **first time at this group**: they could
  explain why a kid has few connections (left early, or new), but nothing uses
  them. Keep them only if staff will look at them.
- **Felt included**: clearly belonging, but its answer scale wasn't set in the
  doc. Agree it with GFM before using it in a trial.

## Rules for changing a question

- Once a session has asked a question, never change its wording, options or
  scoring. Add a new question with a new id instead (for example
  `iis_circles_young` for a younger-child version). Each session stores the ids
  it asked, so old answers keep the exact question they were given.
- A new question needs a kind. If it isn't interaction, belonging or learning,
  give it `purposeUnclear: true` and say why in `note`.
- Each question saves to its own column (see `field`). Never reuse another
  question's column, even if the scale looks the same. That is why
  identification (1 to 7) has its own column instead of reusing `q5` (1 to 5).

## Sessions made before these labels

Sessions from before November 2026 have no stored question list. They count as
having asked the original Connected check-in: worked with, talked to, knew
before, the circles (Q4), the 1-to-5 belonging question (Q5), stayed for the
whole session and first time. Their check-ins didn't record whether a kid
tapped nobody or skipped a "who" question, so the report says "not recorded"
for those, and the network uses the old paper rule (answering a rating counts
as handing in the sheet).
