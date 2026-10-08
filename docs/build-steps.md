# Build steps: the backend

## How this doc works

This doc covers the backend. Each step below becomes one pull request (PR), a request for me to review your changes and add them to the main code. Do the steps in order, since later steps build on earlier ones.

For each step:
1. Make a new branch for it (see "Working on a step" below).
2. Paste the prompt from the step into Claude Code, and read the plan it gives you before letting it make changes.
3. Test it the way the step describes.
4. Commit, push and open a PR. Answer the step's questions in the PR description.
5. I'll review it, usually within a day. Once I approve it, you merge it.

This doc lives in the repo, so you can and should edit it:
- If an explanation confused you, rewrite it.
- If you think a step should work differently, change the doc in a small PR first, then build it.

Progress (tick each one off in its PR):

- [ ] Step 0: Your first pull request
- [ ] Step 1: Groups and people
- [ ] Step 2: Sessions and who's here
- [ ] Step 3: Saving a check-in
- [ ] Step 4: Loading a group
- [ ] Step 5: The network
- [ ] Step 6: The numbers
- [ ] Step 7: The big test
- [ ] Step 8: Comparing two sessions
- [ ] Step 9: Who to check on
- [ ] Step 10: Positions for the picture

## How the code is organized

The app has two halves:
- The frontend is the screens people see and tap.
- The backend is everything behind the screens: saving and loading data, and doing the calculations.

This doc covers the backend. Once it's done, we'll plan the frontend together.

```
connection-app/
  index.html        the app's main page
  ui/               the screens (we'll plan these after the backend)
  core/             the backend (this doc)
    data.js         saving to and loading from the database (steps 1 to 4)
    network.js      who is linked to whom (step 5)
    numbers.js      the numbers for a session (step 6)
    compare.js      comparing two sessions (step 8)
    insights.js     who to check on (step 9)
    positions.js    where each dot goes in the picture (step 10)
  lib/supabase.js   the database connection (already set up)
  tests/            automated tests, and test data in tests/fixtures/
  docs/             the guides: onboarding, outline, and these build steps
```

The calculation files never talk to the database: that's everything in `core/` except `data.js`. They take data in and hand results back, which makes them easy to test.

## The database

These are the tables, and the columns in each:

```
groups       id, name, age_range, program_type, created_at
people       id, group_id, name, created_at
sessions     id, group_id, number, date, activity_type, activity_note, created_at
attendance   session_id, person_id
answers      id, session_id, person_id, q4, q5, stayed_whole, first_time, created_at
ticks        id, session_id, from_person, to_person, worked_with, talked_to, knew_before, created_at
```

A few notes:
- **ids** are text strings (uuids), and **`created_at`** is the time a row was saved. Supabase fills both in for us.
- **`groups.age_range`** is the kids' ages, like "11-13".
- **`groups.program_type`** is one of `after_school`, `sports`, `arts`, `camp`, `faith`, `classroom` or `other`. Together with the age range, this lets the research compare different kinds of groups.
- **`sessions.number`** counts up within each group: 1, 2, 3 and so on.
- **`sessions.activity_type`** is what the group did that day, picked from a fixed list:
  - `pairs`: kids worked in pairs
  - `small_groups_leader_chose`: small groups that the leader picked
  - `small_groups_kids_chose`: small groups that the kids picked
  - `whole_group_game`
  - `whole_group_discussion`
  - `free_time`
  - `other`

  Using a fixed list means activities can be compared across every group. That's how the research will find out which kinds of activities help kids connect.
- **`sessions.activity_note`** is an optional description, like "Bridge building".
- **`attendance`** has one row for each kid at a session.
- **`answers`** has one row per kid who checked in:
  - `q4` is 1 to 7 and `q5` is 1 to 5. Either can be empty (null) if the kid skipped it.
  - `stayed_whole` and `first_time` are "Y", "N" or an empty string.
- **`ticks`** has one row for each kid someone tapped:
  - `from_person` is the kid who tapped, and `to_person` is the kid they tapped.
  - `worked_with` and `talked_to` say which boxes they ticked.
  - `knew_before` is true if the kid already knew that person before joining the group. The check-in screen will only ask this the first time a kid checks in, so a tick can have `knew_before` true and the other two false.
  - If two kids tapped each other, that's two rows.

The database refuses data that breaks these rules. For example, it won't save a `q4` of 9, a kid ticking themselves, or a second answer from the same kid in one session. Supabase sends back an error instead.

## The group object

The calculations don't read the database directly. Instead, step 4 loads everything about a group into one JavaScript object, and every calculation takes that object as its input. It looks like this:

```js
{
  id: "g1",
  name: "Tuesday Club",
  ageRange: "11-13",
  programType: "after_school",
  people: [
    { id: "p1", name: "Ana" },
    { id: "p2", name: "Ben" }
  ],
  sessions: [
    {
      id: "s1",
      number: 1,
      date: "2026-10-14",
      activityType: "small_groups_leader_chose",
      activityNote: "Bridge building",
      present: ["p1", "p2"],
      answers: [
        { personId: "p1", q4: 5, q5: 4, stayedWhole: "Y", firstTime: "N" }
      ],
      ticks: [
        { from: "p1", to: "p2", workedWith: true, talkedTo: false, knewBefore: false }
      ]
    }
  ]
}
```

### The tiny example

Several steps use this small, made-up group, because it's small enough to work out by hand. All six kids were at session 1.

| Kid | Q4 | Q5 | Who they tapped |
|---|---|---|---|
| Ana | 5 | 4 | worked with Ben and Cara, talked to Cara |
| Ben | 4 | 3 | talked to Ana |
| Cara | 6 | 5 | talked to Dev |
| Dev | skipped | skipped | nobody |
| Eli | 3 | 2 | nobody |
| Fay | didn't check in | | |

## Working on a step

Every step follows the same routine. You type all of these commands into the terminal in VS Code (the onboarding guide shows how to open it).

In the commands below, `step-1-groups` is just an example branch name. Use a short name for whichever step you're working on, like `step-2-sessions` for step 2. Type everything else exactly as shown.

**1. Before you start the step,** get the latest code and make a branch for it:

```
git switch main
git pull
git switch -c step-1-groups
```

- `git switch main` moves you to the main version of the code.
- `git pull` downloads any changes that were merged since you last looked.
- `git switch -c step-1-groups` creates a new branch called step-1-groups, and moves you onto it.

A branch is your own copy of the code to work in. Nothing you do on it changes the main version until I've reviewed it.

**2. Do the step.** Follow the step's instructions. While you work, two commands are useful:

```
npm test
npm run dev
```

- `npm test` runs all the automated tests.
- `npm run dev` runs the app on your computer, and prints a link to open in your browser. Press Control+C (not Cmd+C) in the terminal to stop it.

**3. When the step is finished and tested,** save your work and upload it:

```
git add .
git commit -m "Groups and people"
git push -u origin step-1-groups
```

- `git add .` gathers up all the files you changed.
- `git commit` saves them as one checkpoint, along with a short message that describes what you did. Write your own message.
- `git push` uploads your branch to GitHub.

**4. Open a pull request.**
1. Go to the repo on GitHub. You'll see a banner about your branch, with a "Compare & pull request" button. Click it.
2. Fill in the description. The template asks what you changed, how you tested it, and your answers to the step's questions.
3. Click "Create pull request". After a minute or two, Vercel adds a preview link to the PR.

**5. After I approve it,** click "Squash and merge" on the PR. Then you're ready for the next step, starting again from 1.

## Tips for working with Claude Code

- **It already knows the project rules.** It reads `CLAUDE.md` in the repo automatically. One of those rules is to explain its plan before changing anything.
- **Ask why.** "Explain this like I'm new to coding" works well.
- **Check what changed.** Before you commit, look at the changes in VS Code's Source Control panel.
- **It will sometimes be wrong.** When a test fails, paste the error in, and ask it to explain the cause before it fixes anything.
- **If you're stuck for more than half an hour,** message me with what you tried and the error you got.

# The backend steps

## Step 0: Your first pull request

This step tries out the whole routine with a tiny change, so you know everything works before any real code.

1. Make a branch called `step-0-hello` (part 1 of "Working on a step").
2. Create a file called `tests/hello.test.js` with this in it:

   ```js
   import test from "node:test";
   import assert from "node:assert/strict";

   test("the computer can add", () => {
     assert.equal(1 + 1, 2);
   });
   ```

3. Run `npm test`. Near the end, it should say `pass 1`.
4. Change the 2 to a 3 and run `npm test` again, to see what a failing test looks like. Then change it back.
5. Pick a name for the app. Put it at the top of `README.md`, in place of "connection-app" and the line under it.
6. Commit, push and open your first PR (parts 3 and 4 of "Working on a step"). Check that the Vercel preview link shows up on it.
7. Once I approve it, merge it.

## Step 1: Groups and people

This is the first code that talks to the database. You'll write functions that create a group, add kids to it, and read them back.

Prompt:

```
We're doing Step 1 of docs/build-steps.md. First read the sections "How
the code is organized" and "The database".

Create core/data.js with these functions, using the supabase client from
lib/supabase.js:
- createGroup(name, { ageRange, programType }): adds a row to groups and
  returns it
- listGroups(): returns all groups, newest first
- addPerson(groupId, name): adds a row to people and returns it
- listPeople(groupId): returns the people in a group, sorted by name
If Supabase returns an error, throw it so we notice.
Explain your plan before writing any code.
```

**How to test it:**
1. Run `npm run dev` and open the app.
2. Open the browser console: right-click the page, choose Inspect, then the Console tab.
3. Load your file and try the functions:

   ```js
   const data = await import("/core/data.js");
   const group = await data.createGroup("Test club", { ageRange: "11-13", programType: "after_school" });
   await data.addPerson(group.id, "Ana");
   await data.addPerson(group.id, "Ben");
   await data.listPeople(group.id);
   ```

   The last line should show Ana and Ben.
4. Open the Table Editor in Supabase and check that the rows are there.

**In your PR:** What's the difference between the group's id and its name? Why do we connect tables using ids instead of names?

## Step 2: Sessions and who's here

Each time the group meets is a session. You'll add functions that start a new session and record who came.

Prompt:

```
We're doing Step 2 of docs/build-steps.md. Add to core/data.js:
- startSession(groupId, { date, activityType, activityNote }): adds a row
  to sessions. The number should be one more than the group's highest
  session number, or 1 if it has none yet. Returns the new row.
- setPresent(sessionId, personIds): makes the attendance rows for this
  session match personIds exactly, adding and removing rows as needed.
Explain your plan before writing any code.
```

**How to test it:** in the console, start two sessions for your test group and check that they're numbered 1 and 2. Call `setPresent` with both kids, then again with just one. Check in the Table Editor that the attendance rows match each time.

**In your PR:** Why does `setPresent` replace the whole list, instead of only adding people?

## Step 3: Saving a check-in

When a kid finishes checking in, the app saves their answers and everyone they tapped. The check-in screen will call this function.

Prompt:

```
We're doing Step 3 of docs/build-steps.md. Add saveCheckIn(sessionId, {
personId, workedWith, talkedTo, knewBefore, q4, q5, stayedWhole,
firstTime }) to core/data.js. workedWith, talkedTo and knewBefore are
arrays of person ids, and knewBefore can be left out.
- Save one row in answers. Skipped ratings are saved as null.
- Save one row in ticks for each person in any of the three lists, with
  worked_with, talked_to and knew_before set to whether they're in each
  list.
- If this kid already checked in for this session, replace their old
  answer and ticks instead of adding a second copy.
Explain your plan before writing any code.
```

**How to test it:**
1. Check Ana in, saying she worked with Ben, talked to Ben, and already knew Ben.
2. In the Table Editor, you should see one answer row for Ana, and one tick row with all three columns true.
3. Check Ana in again with different answers. She should still have only one answer row, and her ticks should have changed.

**Your call:** if a kid checks in twice, should we keep the first check-in or replace it? The prompt says replace. If you'd rather keep the first, change the prompt and explain why in your PR.

**In your PR:** Why is a skipped rating saved as null instead of 0?

## Step 4: Loading a group

The calculations need everything about a group in one object (see "The group object" above). This step builds that object from the database.

Prompt:

```
We're doing Step 4 of docs/build-steps.md. Add loadGroup(groupId) to
core/data.js. It returns the group object described in the section "The
group object": the group's id and name, its people, and its sessions in
number order, each with present, answers and ticks. Rename columns to the
names used in that section (person_id becomes personId, worked_with
becomes workedWith, and so on).
Explain your plan before writing any code.
```

**How to test it:**
1. Build the tiny example in the database as a new group, using your functions from steps 1 to 3. You can ask Claude Code for a snippet to paste into the console.
2. Run `await data.loadGroup(group.id)`.
3. Check the result:
   - 6 people and 1 session
   - 6 kids present
   - 5 answers, since Fay never checked in
   - 4 ticks
   - Ana's tick for Cara has `workedWith` and `talkedTo` both true
   - Dev's answer has `q4` and `q5` both null

**In your PR:** Why do we load everything into one object, instead of having each calculation ask the database for what it needs?

## Step 5: The network

Now the calculations. The first one turns a session's ticks into a network: a list of people (the dots) and a list of links between them (the lines). Everything we show the leader comes from this.

Two kids are linked if either of them tapped the other. Kids forget to tap people, so one tap is enough. If both kids tapped each other, it's still a single link. Knowing someone before doesn't count, because the network is about what happened at this session. A kid's degree is how many links they have.

Each kid also gets a status:
- **connected:** has at least one link.
- **isolate:** has no links, but answered Q4 or Q5. They checked in and really didn't connect with anyone.
- **unknown:** has no links, and didn't answer Q4 or Q5. They skipped the check-in or left it blank, so we can't tell.

Dev in the tiny example skipped everything, but Cara tapped him, so he's connected.

Prompt:

```
We're doing Step 5 of docs/build-steps.md.

First create tests/fixtures/tiny-group.js, exporting tinyGroup(). It
returns the tiny example from the doc as a group object, using the ids
"p1" to "p6" for Ana to Fay, and a fresh copy every time it's called.

Then create core/network.js with buildNetwork(group, sessionNumber), which
returns { people, links, degree, status }:
- people: the ids of everyone present, sorted
- links: one { a, b, worked, talked } for each linked pair, with a < b,
  sorted. worked is true if either kid's tick had workedWith, and the
  same for talked.
- degree and status: objects keyed by person id, using the rules in Step 5
Ignore ticks where workedWith and talkedTo are both false (like ticks that
only say knewBefore), ticks where a
kid tapped themselves, and ticks involving anyone who wasn't present.
This file must not import anything from lib/ or core/data.js.
Write tests in tests/network.test.js. Explain your plan first.
```

**How to test it:** run `npm test`. For the tiny example, the tests should check that:
- there are 3 links: Ana and Ben, Ana and Cara, and Cara and Dev
- Ana and Ben's link has `worked` and `talked` both true, because Ana said worked and Ben said talked
- Cara and Dev's link has only `talked` true
- the degrees are Ana 2, Ben 1, Cara 2, Dev 1, Eli 0 and Fay 0
- Ana, Ben, Cara and Dev are connected, Eli is an isolate, and Fay is unknown

Also add three small tests of your own, written by hand. None of these should create a link:
- a tick with both boxes false
- a kid tapping themselves
- a tick to someone who wasn't there

**In your PR:** Why is Fay unknown and not an isolate? Why does one tap count as a link?

## Step 6: The numbers

These are the numbers the leader sees for a session. Here, n is the number of kids present.

```
present         how many kids were there
answered        how many checked in (blank check-ins count)
links           how many links
density         links / (n * (n - 1) / 2), the share of all possible pairs that are linked
isolates        how many kids are isolates
unknown         how many kids are unknown
centralization  the sum of (highest degree - each kid's degree), divided by (n - 1) * (n - 2)
averageLinks    2 * links / n
q4Average       the average Q4 answer, ignoring skipped ones
q4Count         how many kids answered Q4
q5Average       the same for Q5
q5Count         how many kids answered Q5
```

Centralization is 0 when everyone has the same number of links. It's 1 when one kid is linked to everyone and nobody else is linked at all. A high number means the group depends on one person.

**Special cases:**
- Density is null with fewer than 2 kids.
- Centralization is null with fewer than 3 kids.
- An average is null if nobody answered.
- Don't round anything here. The screens will round numbers when they display them.

**Try it yourself:** write the density function yourself before asking Claude Code. It's only a few lines.

Prompt:

```
We're doing Step 6 of docs/build-steps.md. Create core/numbers.js with
sessionNumbers(group, sessionNumber). It uses buildNetwork and returns the
numbers listed in Step 6, following the special cases exactly. Also export
density(network) and centralization(network) on their own. I've already
written density myself, so check it and keep it if it's right.
Write tests in tests/numbers.test.js. Explain your plan first.
```

**How to test it:** run `npm test`. The tiny example should give:
- present 6, answered 5, links 3
- density 0.2
- isolates 1, unknown 1
- centralization 0.3
- averageLinks 1
- q4Average 4.5 (q4Count 4) and q5Average 3.5 (q5Count 4)

Also test:
- the special cases
- a "star", where one kid is linked to everyone else and nobody else is linked. It should give centralization 1.
- a group where everyone has the same number of links. It should give centralization 0.

Compare decimals with a small tolerance instead of exact equality, like `assert.ok(Math.abs(actual - expected) < 0.001)`. Computers store decimals slightly imprecisely; type `0.1 + 0.2` into the browser console to see.

Once the tests pass, break density on purpose: change it to `links / n` and run the tests. Read the failures, then undo the change.

**In your PR:** What does a centralization of 1 look like? Why do we ignore skipped answers instead of counting them as 0?

## Step 7: The big test

`tests/fixtures/fake-site.json` is a made-up group of 20 kids over two sessions. It came from the research prototype, and we know the right answer for every number. This test checks that your calculations match the research code exactly.

**Try it yourself:** write this test. Ask Claude Code for help if you get stuck.
1. Load the JSON file.
2. Run `sessionNumbers` for sessions 1 and 2.
3. Check every number in this table:

| | Session 1 | Session 2 |
|---|---|---|
| present | 20 | 16 |
| answered | 20 | 16 |
| links | 19 | 22 |
| density | 0.100 | 0.183 |
| isolates | 2 | 2 |
| unknown | 1 | 1 |
| centralization | 0.532 | 0.629 |
| averageLinks | 1.90 | 2.75 |
| q4Average (q4Count) | 4.00 (18) | 5.00 (15) |
| q5Average (q5Count) | 3.00 (18) | 4.00 (15) |

Also check the statuses in both sessions: S13 is connected, S14 is unknown, and S15 and S16 are isolates.

To load the file in a test:

```js
import { readFileSync } from "node:fs";
const group = JSON.parse(readFileSync(new URL("./fixtures/fake-site.json", import.meta.url), "utf8"));
```

**In your PR:** S13 left the check-in blank in session 1, so why are they still connected? If one of these numbers didn't match, how would you track down which step has the bug?

## Step 8: Comparing two sessions

This is the before-and-after view. Did kids make new connections? Are the same kids still on their own? Did the ratings go up?

The most important rule: only compare kids who came to both sessions. Here's why. Say 10 kids come to session 1: five rate it a 2 and five rate it a 6, so the average is 4. The five who gave it a 2 don't come back, and the other five rate it 6 again. The average jumped to 6, but nobody's feelings changed. Only who showed up changed.

`compareSessions(group, a, b)` returns:

```
bothPresent     how many kids were at both sessions
newLinks        links in session b, between kids at both sessions, that weren't there in session a
lostLinks       links in session a, between kids at both sessions, that are gone in session b
stillIsolated   kids at both sessions who were isolates both times
q4, q5          { before, after, change, count }, using only kids at both sessions who answered that question both times
warning         a sentence when the ratings and the network disagree, or null
```

The warning appears in two cases:
- a Q4 or Q5 average goes up while `stillIsolated` is above 0
- a Q4 or Q5 average goes down while `newLinks` is above 0

Changes that round to 0.00 don't count. Examples:

| Q4 change | Q5 change | Still isolated | New links | Warning |
|---|---|---|---|---|
| +0.6 | 0 | 2 | 0 | Average Q4 rose by 0.60, but 2 people were isolated in both sessions. |
| 0 | -0.4 | 0 | 1 | Average Q5 fell by 0.40, but 1 new connection formed. |
| +0.5 | -0.25 | 1 | 3 | Average Q4 rose by 0.50, but 1 person was isolated in both sessions; average Q5 fell by 0.25, but 3 new connections formed. |
| +0.6 | +0.6 | 0 | 4 | none |
| -0.6 | -0.1 | 3 | 0 | none |
| +0.004 | 0 | 2 | 2 | none, because it rounds to 0.00 |

Prompt:

```
We're doing Step 8 of docs/build-steps.md. Create core/compare.js with:
- newLinkPairs(group, a, b): sorted [id, id] pairs that are links in
  session b but not in session a, between kids present at both
- compareSessions(group, a, b): the object described in Step 8. If a and b
  are left out, compare the first and last sessions.
- warningSentence(comparison): follows the rule and examples in Step 8
Write tests in tests/compare.test.js, including every row of the warning
table. Explain your plan first.
```

**How to test it:** run `npm test`. With the fake site, `compareSessions` should give:
- bothPresent 16, newLinks 5, lostLinks 0, stillIsolated 2
- Q4 going from 4.00 to 5.00 (change +1.00, count 14)
- Q5 going from 3.00 to 4.00 (change +1.00, count 14)
- the warning "Average Q4 rose by 1.00 and average Q5 rose by 1.00, but 2 people were isolated in both sessions."

`newLinkPairs` should give S02-S04, S03-S06, S05-S07, S08-S10 and S09-S11.

**Your call:** leaders will read the warning, so if you can word it more clearly, go for it. Update the tests to match.

**In your PR:** Why do we only compare kids who came both times? Why is the count 14 and not 16? (Look at S13 and S14.)

## Step 9: Who to check on

This is probably the most useful thing for a leader: a list of kids who might need help connecting.

For a session, list:
- each isolate, with the reason "no-links"
- any isolate who was also an isolate at the previous session, with the reason "no-links-twice" instead
- each unknown kid, with the reason "no-answer"

Each item is `{ id, name, reason }`. Put "no-links-twice" first, then "no-links", then "no-answer", and sort by name within each.

Prompt:

```
We're doing Step 9 of docs/build-steps.md. Create core/insights.js with
peopleToCheckOn(group, sessionNumber), following Step 9. Also export
REASON_TEXT, which maps each reason to a short, kind sentence for the
screen, like "no-links": "No connections this session".
Write tests in tests/insights.test.js. Explain your plan first.
```

**How to test it:** run `npm test`.
- The tiny example should give Eli (no-links) and Fay (no-answer).
- The fake site's session 2 should give S15 and S16 (no-links-twice), then S14 (no-answer).
- Kids who are connected should never be on the list.

**Your call:** the wording in REASON_TEXT. Leaders will see it, so keep it kind. "No connections this session" is better than "Isolated."

**In your PR:** Why might a kid with no answer be completely fine?

## Step 10: Positions for the picture

The last backend step works out where each kid's dot goes in the network picture. We'll put the dots evenly around a circle, in alphabetical order by name. Each kid keeps the same spot in every session's picture, so a leader can compare sessions side by side.

The maths:
- Take a circle centered at (0.5, 0.5) with radius 0.4. The dot at angle `t` sits at `x = 0.5 + 0.4 * Math.cos(t)` and `y = 0.5 + 0.4 * Math.sin(t)`.
- On screens, y grows downward. So the top of the circle is at `t = -Math.PI / 2`, and adding to `t` moves clockwise.
- With n kids, each dot is `2 * Math.PI / n` further around than the last.

**Try it yourself:** write `circlePositions(group)` in `core/positions.js` yourself. It returns `{ id: { x, y } }` for everyone in `group.people`, starting at the top with the first name alphabetically and going clockwise. Then ask Claude Code to review it and write the tests:

```
We're doing Step 10 of docs/build-steps.md. I wrote core/positions.js
myself. Please review it, explain anything I got wrong, and write
tests/positions.test.js.
```

**How to test it:** run `npm test`. The tests should check that:
- every kid gets a position, with x and y between 0 and 1
- the same group always gives the same positions
- every dot is 0.4 from the center
- neighboring dots are evenly spaced
- the first kid alphabetically is at the top, at (0.5, 0.1)

**In your PR:** Why does each kid need to stay in the same spot in every session's picture?

## What's next

That's the whole backend. Once these steps are merged, we'll sit down together and plan the frontend: the screens that leaders and kids will actually use.
