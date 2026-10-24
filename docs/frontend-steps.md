# Build steps: the frontend

## How this doc works

The backend is done. This doc covers the frontend: the screens that leaders and kids use. It works the same way as the backend guide:

1. Make a branch for the step. The routine is the same as "Working on a step" in `docs/build-steps.md`.
2. Paste the step's prompt into Claude Code, and read the plan it gives you before letting it make changes.
3. Test it with the step's checklist. Every step says exactly what you should see.
4. Commit, push and open a PR. Answer the step's question in the PR description.
5. Message me when it's up, and I'll review it the same day. Once I approve it, merge it.

You can put more than one step in a PR, like you did for the backend. Steps 11 to 13 make a good first PR, and steps 14 to 16 a good second one.

When all the steps are merged, the last section, "Test the whole app", walks you through using the app from start to finish, the way a leader and their kids will.

Progress (tick each one off in its PR):

- [ ] Before you start: try the check-in screen
- [ ] Step 11: The groups screen
- [ ] Step 12: The group screen
- [ ] Step 13: The session screen
- [ ] Step 14: The results screen
- [ ] Step 15: The picture
- [ ] Step 16: Comparing sessions
- [ ] Test the whole app

## What's already built

I've set up a few things so you can focus on the screens:

- **The kid check-in screen** (`ui/checkin.html` and `ui/checkin.js`). It's finished and tested, so you won't need to change it. Your session screen links to it in step 13.
- **The shared look** (`ui/style.css`): colors, buttons, forms, and boxes for numbers. Every screen uses it.
- **Helpers** (`ui/app.js`): small functions that every screen needs. They're described below.
- **A starter file for each screen** in `ui/`. Each one has the page layout and a note saying which step fills it in.
- **Two test groups** in the database:
  - **Fake site (test data):** the 20 kids from step 7, with both sessions already filled in. We know the right answer for every number, so this is how you'll check the results screens. Don't check in to it, or its numbers will change. If that happens by accident, tell me and I'll reset it.
  - **Practice group:** Ana to Fay from the tiny example, with session 1 started and everyone marked as here. Use it to try the check-in screen.

Your own "Tiny example" group from step 4 is useful too, since you know its numbers by heart.

## How the screens fit together

The app has six screens. Each one is two files in `ui/`: an `.html` file for the page layout, and a `.js` file for the code.

```
Groups  →  Group  →  Session  →  Check-in (kids)
                        ↓
                     Results  →  Compare
```

| Screen | What it's for | Address | Step |
|---|---|---|---|
| Groups | every group, and adding a new one | `ui/groups.html` | 11 |
| Group | a group's kids and sessions, and starting a session | `ui/group.html?group=ID` | 12 |
| Session | who's here, and how check-ins are going | `ui/session.html?group=ID&session=N` | 13 |
| Check-in | kids answer the questions | `ui/checkin.html?group=ID&session=N` | already built |
| Results | one session's numbers, who to check on, and the picture | `ui/results.html?group=ID&session=N` | 14 and 15 |
| Compare | what changed between two sessions | `ui/compare.html?group=ID` | 16 |

The part of an address after the `?` tells the screen what to show. `group=ID` is the group's id, and `session=N` is the session's number (1, 2, 3 and so on), not its id. The app's home page sends you straight to the groups screen.

Every screen works the same way:
1. Read the group id, and the session number if it needs one, from the address with `getParam`.
2. Load the data with `loadGroup` from `core/data.js`.
3. Get any numbers from the backend functions you wrote, like `sessionNumbers` and `peopleToCheckOn`. Screens never do the maths themselves.
4. Build the page with `el`.
5. If anything fails, call `showError`, so the problem shows up on the page.

## The helpers in ui/app.js

| Helper | What it does | Example |
|---|---|---|
| `getParam(name)` | reads a value from the address | on `group.html?group=abc`, `getParam("group")` gives `"abc"` |
| `urlFor(page, params)` | builds the address of another screen | `urlFor("results.html", { group: group.id, session: 2 })` |
| `el(tag, props, ...children)` | makes a page element | `el("button", { onclick: save }, "Save")` |
| `svgEl(tag, attrs, ...children)` | the same, for the parts of a picture | `svgEl("circle", { cx: 50, cy: 50, r: 3 })` |
| `showError(error)` | shows a red message at the top of the page | `showError(error)` inside a `catch` |
| `formatNumber(value, decimals)` | rounds a number for the screen, and shows "n/a" for null | `formatNumber(0.18333, 2)` gives `"0.18"` |
| `today()` | today's date | `"2026-10-24"` |
| `PROGRAM_TYPES`, `ACTIVITY_TYPES` | the choices the database accepts, with the words a leader sees | for dropdowns |
| `labelFor(list, value)` | the words for a saved value | `labelFor(ACTIVITY_TYPES, "free_time")` gives `"Free time"` |

A few more things about `el`:
- `props` can set things like `className`, `href`, `value`, `checked` and `onclick`.
- Children can be text, other elements, or lists of them. `null` and `false` are skipped, which is handy for parts that only show sometimes.
- Text goes in as plain text, so a name like "Ana <3" shows up exactly as typed. That's why the screens build everything with `el`, instead of writing HTML into `innerHTML`.

## Testing a screen

Every step ends with a "How to test it" checklist. These are the tools you'll use:

- **Run the app:** `npm run dev`, then open the link it prints. To go straight to a screen, add its address to the end of the link, like `http://localhost:3000/ui/groups.html`.
- **The console:** right-click the page, choose Inspect, then the Console tab. Errors show up there in red. If something doesn't work, look there first, and paste the error into Claude Code.
- **The Table Editor in Supabase:** shows the rows a screen saved.
- **Phone size:** leaders will mostly use phones. In the Inspect panel, click the icon of a phone and tablet at the top left to see the page at phone size. You can also open your PR's Vercel preview link on your phone.
- **The test groups:** "Fake site (test data)" and your "Tiny example" have a known right answer for every number.

Once step 12 is done, you can open any group from the groups screen, and its id will be in the address bar. Before that, here are the test groups' ids:

| Group | id |
|---|---|
| Fake site (test data) | `66a1ce21-10e8-4aa5-b576-5081e61e1b09` |
| Practice group | `68708fce-4f5a-4d74-9f57-a6322b3a51e9` |

## Before you start: try the check-in screen

There's no PR for this part. It's a chance to see how the app feels for kids, and how the code for a finished screen is laid out.

1. Get the latest code:

   ```
   git switch main
   git pull
   ```

2. Open the Practice group's check-in on the live site, on your phone if you can:

   https://connection-app-alpha.vercel.app/ui/checkin.html?group=68708fce-4f5a-4d74-9f57-a6322b3a51e9&session=1

3. Check in as Ana. Say she worked with Ben and talked to Cara, and answer the rest however you like. Because it's her first check-in, she's also asked who she knew before joining the group. Kids only get that question once.
4. Check in as Ben. Notice that Ana now has a ✓ next to her name, and the page counts how many kids have checked in.
5. Open the `answers` and `ticks` tables in Supabase, and find the rows you just made.
6. Tap Ana's name again. It asks before replacing her answers.
7. Ask Claude Code: `Explain ui/checkin.js to me like I'm new to coding.` Your screens will follow the same pattern: load the group, build the page with `el`, and show it.

# The frontend steps

## Step 11: The groups screen

This is the first screen a leader sees. It lists every group, and has a form to add a new one.

Prompt:

```
We're doing Step 11 of docs/frontend-steps.md. First read the sections
"How the screens fit together" and "The helpers in ui/app.js".

Fill in ui/groups.js (and ui/groups.html if it needs anything) so the
groups screen:
- lists every group from listGroups(), newest first, showing each
  group's name, age range and program type (use labelFor with
  PROGRAM_TYPES). Each name links to group.html?group=ID.
- has a form to add a group: name (required), age range (like 11-13),
  and program type (a dropdown made from PROGRAM_TYPES). Saving calls
  createGroup, then opens the new group's screen.
- shows a short message if there are no groups yet.
Build the page with el(), and call showError() if loading or saving
fails. Explain your plan before writing any code.
```

**How to test it:**
1. Run `npm run dev` and open the link. The home page should take you to the groups screen.
2. You should see Practice group, Fake site (test data), Tiny example and Test club, newest first.
3. Add a group called "My test group", ages 11-13, program type Sports. You should land on its group screen. It's still the starter page, but the address should end with `group.html?group=` and an id.
4. Go back. "My test group" is at the top of the list, with "11-13" and "Sports".
5. Try to add a group without a name. It shouldn't save.
6. Find your new row in the `groups` table in Supabase.
7. Look at the screen at phone size.

**Your call:** how each group looks in the list. Also, the header on every screen says "Connected". If you've picked a different name for the app, change it.

**In your PR:** Why does the link to a group use its id instead of its name?

## Step 12: The group screen

Leaders come here every week, to add kids and to start the day's session.

Two kids with the same name would see two identical buttons on the check-in screen. So if a leader adds a name that's already in the group, the screen asks for a last initial instead, like "Ana P.".

Prompt:

```
We're doing Step 12 of docs/frontend-steps.md. Fill in ui/group.js (and
ui/group.html if needed). The group id comes from the address
(group.html?group=ID). Load the group with loadGroup and show:
- the group's name, age range and program type, and a link back to the
  groups screen
- Kids: everyone in the group, sorted by name, and a form to add a kid
  with addPerson. After adding, clear the box and keep the cursor in it,
  so the leader can type the next name straight away. If the group
  already has a kid with that name (ignoring capital letters), don't add
  it. Show a message asking for a last initial, like "Ana P.", instead.
- Sessions: newest first, each showing its number, date and activity
  (labelFor with ACTIVITY_TYPES), and linking to
  session.html?group=ID&session=NUMBER
- Start a new session: a date (starting on today()), an activity type
  (a dropdown from ACTIVITY_TYPES) and an optional note. Starting calls
  startSession, then opens the new session's screen.
- a link to compare.html?group=ID, only when there are 2 or more
  sessions
If the address has no group id, or the group can't be loaded, show a
clear message instead of a blank page. Use el() and showError().
Explain your plan before writing any code.
```

**How to test it:**
1. On the groups screen, click "My test group". Its id should be in the address.
2. Add Ana, Ben, Cara, Dev, Eli and Fay, pressing Enter after each one. Each name should appear in alphabetical order, and the box should be empty and ready for the next name.
3. Try adding "ana". It should ask for a last initial instead of adding her.
4. Start a session with activity "Pairs". You should land on the session screen (still a starter page) with `session=1` in the address.
5. Go back to the group. Session 1 is listed with today's date and "Pairs".
6. Start another session. It should be session 2, and the compare link should now show up.
7. Open "Fake site (test data)". It has 20 kids, S01 to S20, and 2 sessions.
8. Open `ui/group.html` with nothing after it. You should see a message, not a blank page.
9. Check the `people` and `sessions` tables in Supabase, and look at the screen at phone size.

**Your call:** the order of things on this screen. Leaders open it every week to start a session, so maybe that should come first.

**In your PR:** Why does `startSession` work out the session number from the database, instead of the screen counting the sessions it shows?

## Step 13: The session screen

The leader uses this screen during a session: to mark who's here, to hand their phone to the kids for check-in, and to see how check-ins are going.

Remember the backend rule: answers only count from kids who are marked as here. So this screen also warns the leader when a kid has checked in but isn't marked as here.

Prompt:

```
We're doing Step 13 of docs/frontend-steps.md. Fill in ui/session.js
(and ui/session.html if needed). The address is
session.html?group=ID&session=NUMBER. Load the group with loadGroup and
find the session by its number. Show:
- the session's number, date, activity and note, and a link back to the
  group screen
- Who's here: a checkbox for every kid in the group, ticked if they're
  in session.present, and a Save button that calls setPresent with the
  ticked kids' ids. Show "Saved" when it's done.
- Check-ins: "X of Y checked in", counting kids who are marked as here
  and have an answer, and the names of kids who are here but haven't
  checked in yet
- a warning naming any kid who has an answer but isn't marked as here,
  saying their answers won't count unless they're ticked
- a "Start check-ins" button linking to
  checkin.html?group=ID&session=NUMBER, and a "See results" link to
  results.html?group=ID&session=NUMBER
After saving, load the group again so the check-ins and the warning are
up to date. If the address is wrong or the session doesn't exist, show
a clear message. Use el() and showError(). Explain your plan before
writing any code.
```

**How to test it:**
1. Open session 1 of "My test group". Nobody is ticked yet.
2. Tick all six kids and save. Reload the page: they should still be ticked. The `attendance` table should have 6 rows for this session.
3. Click "Start check-ins". You should see the check-in screen with all six names. Check in as Ana, then tap "Leader: back to the session screen" under the names.
4. The session screen should say "1 of 6 checked in", and list Ben, Cara, Dev, Eli and Fay as not checked in yet.
5. Untick Ana and save. A warning about Ana should appear. Tick her again and save, and the warning should go away.
6. Open session 2 of "Fake site (test data)". 16 kids are ticked, and it says "16 of 16 checked in".
7. Look at the screen at phone size. Leaders will tick the boxes with their thumbs, so make sure they're easy to tap.

**Your call:** a "Tick everyone" button would save leaders of big groups a lot of taps. Add one if you like.

**In your PR:** Why does a kid have to be marked as here for their answers to count?

## Step 14: The results screen

This is what the leader came for: one session's numbers, and the kids who might need help connecting. Step 15 adds the picture.

Leaders aren't researchers, so each number gets a few plain words that say what it means. This is the only place numbers get rounded, using `formatNumber`:
- density and centralization: 2 decimals
- average links: 1 decimal
- the Q4 and Q5 averages: 2 decimals, with how many kids answered

Prompt:

```
We're doing Step 14 of docs/frontend-steps.md. Fill in ui/results.js
(and ui/results.html if needed). The address is
results.html?group=ID&session=NUMBER. Load the group and show:
- the group's name, the session's number, date and activity, and a link
  back to the session screen
- the numbers from sessionNumbers(group, number), each in a box with
  the class "stat": the number in big type (class "value") and a few
  plain words under it (class "label"). Round with formatNumber:
  density and centralization to 2 decimals, averageLinks to 1, and
  q4Average and q5Average to 2, followed by "(N answered)".
- Who to check on: peopleToCheckOn(group, number), with each kid's name
  and the REASON_TEXT for their reason. If the list is empty, say that
  everyone connected with someone.
- links to the previous and next session's results when they exist,
  and to compare.html?group=ID when there are 2 or more sessions
If nobody is marked as here, say so instead of showing the numbers.
Leave an empty spot under the numbers for the picture, which Step 15
adds. If the address is wrong or the session doesn't exist, show a
clear message. Use el() and showError(). Explain your plan before
writing any code.
```

**How to test it:**
1. Open the results for "Fake site (test data)" session 1: open the group, then the session, then click "See results". Check every number against this table, then do the same for session 2.

   | On the screen | Session 1 | Session 2 |
   |---|---|---|
   | kids here (present) | 20 | 16 |
   | checked in (answered) | 20 | 16 |
   | links | 19 | 22 |
   | density | 0.10 | 0.18 |
   | no links (isolates) | 2 | 2 |
   | didn't answer (unknown) | 1 | 1 |
   | centralization | 0.53 | 0.63 |
   | average links | 1.9 | 2.8 |
   | Q4 average | 4.00 (18 answered) | 5.00 (15 answered) |
   | Q5 average | 3.00 (18 answered) | 4.00 (15 answered) |

2. Check "Who to check on":
   - Session 1: S15 and S16 ("No connections this session"), then S14 ("Didn't fill in the check-in")
   - Session 2: S15 and S16 ("No connections this session and last session"), then S14 ("Didn't fill in the check-in")
3. The previous and next links move between sessions 1 and 2.
4. Open your "Tiny example" group's session 1. It should match the numbers from backend step 6: density 0.20, centralization 0.30, Q4 4.50 (4 answered), and so on, with Eli and Fay to check on.
5. Open "Test club" session 1, where only Ana is marked as here. Density and centralization should say "n/a", because they need at least 2 and 3 kids. Then open session 2, where nobody is marked as here. You should see a message instead of the numbers.
6. Look at the screen at phone size. The number boxes should fit two to a row.

**Your call:** the plain words under each number. "Share of possible pairs who connected" means more to a leader than "density".

**In your PR:** Why do the screens round the numbers, instead of `numbers.js` rounding them?

## Step 15: The picture

The picture shows who connected with whom: a dot for each kid who was there, and a line for each link. It goes on the results screen now, and the compare screen will use it too, so it gets its own file, `ui/picture.js`.

How to draw it:
- The picture is an `<svg>` with `viewBox="0 0 100 100"`, which means positions go from 0 to 100 however big it is on the screen.
- Each kid's spot comes from `circlePositions(group)`, which you wrote in step 10. It gives x and y between 0 and 1, so multiply them by 100.
- Only kids who were there get a dot, but everyone keeps their usual spot. That way each kid is in the same place in every session's picture.
- Draw a line for each link from `buildNetwork(group, number)`. Draw the lines first, so the dots sit on top of them.
- Color each dot by its status (connected, isolate or unknown), and add a small key that says what each color means.
- Write each kid's name next to their dot.
- Build the parts with `svgEl`, not `el`. A picture needs a different kind of element, or the browser won't draw it.

Prompt:

```
We're doing Step 15 of docs/frontend-steps.md. Read the step first.
In ui/picture.js, write drawPicture(group, sessionNumber, { highlight })
that returns an <svg> element, following the step:
- viewBox "0 0 100 100", with each kid's spot from circlePositions(group)
  times 100, but dots only for kids present at this session
- a line for each link from buildNetwork(group, sessionNumber), drawn
  before the dots
- dots colored by status, with a key explaining the colors
- each kid's name next to their dot
- highlight is an optional list of [id, id] pairs. Draw those links in
  a different, stronger color. Step 16 uses it to show new links.
Use svgEl from ui/app.js for every part of the picture. Then add the
picture to the results screen, under the numbers.
Explain your plan before writing any code.
```

**How to test it:**
1. Open the results for "Fake site (test data)" session 1:
   - 20 dots and 19 lines
   - S01 at the top, and the rest going clockwise in order
   - S15 and S16 in the isolate color, and S14 in the unknown color
2. Open session 2. There should be 16 dots. S17 to S20 weren't there, so they have no dot, and everyone else is in the same spot as in session 1.
3. Open your "Tiny example" group's session 1. There should be 6 dots and 3 lines: Ana-Ben, Ana-Cara and Cara-Dev. Eli is in the isolate color, and Fay is in the unknown color.
4. Look at it at phone size. The picture should shrink to fit, and the names should still be readable.

**Your call:** the colors, the dot size, and where the names go. You could also make the dots bigger for kids with more links. Pick colors that are easy to tell apart, and make sure the key matches.

**In your PR:** A leader sees a dot with no lines. What could that mean, and how does its color help them tell?

## Step 16: Comparing sessions

The compare screen shows two sessions side by side: before and after. It uses `compareSessions` from step 8, so remember its rule: only kids who came to both sessions are compared.

Prompt:

```
We're doing Step 16 of docs/frontend-steps.md. Fill in ui/compare.js
(and ui/compare.html if needed). The address is compare.html?group=ID.
- Two dropdowns, Before and After, listing the group's sessions. They
  start on the first and last session, and can also be set from the
  address (compare.html?group=ID&a=1&b=2).
- Show compareSessions(group, a, b): kids at both sessions, new links,
  lost links, kids still isolated, and Q4 and Q5 for the kids who came
  both times: before, after, the change with a + or - sign, and how
  many kids. Round with formatNumber to 2 decimals.
- If warning isn't null, show it in a box with the class "warning".
- Show both pictures side by side: drawPicture for session a, and for
  session b with highlight set to newLinkPairs(group, a, b). On a
  phone, they can go one above the other.
- If the group has fewer than 2 sessions, or Before and After are the
  same session, show a short message instead.
- A link back to the group screen.
If the address has no group id, or the group can't be loaded, show a
clear message. Use el() and showError(). Explain your plan before
writing any code.
```

**How to test it:**
1. Open the compare screen for "Fake site (test data)". With session 1 as Before and session 2 as After, you should see:
   - kids at both sessions: 16
   - new links: 5
   - lost links: 0
   - still isolated: 2
   - Q4: 4.00 before, 5.00 after, change +1.00, 14 kids
   - Q5: 3.00 before, 4.00 after, change +1.00, 14 kids
   - the warning "Average Q4 rose by 1.00 and average Q5 rose by 1.00, but 2 people were isolated in both sessions."
2. In the After picture, 5 lines are highlighted: S02-S04, S03-S06, S05-S07, S08-S10 and S09-S11.
3. Set Before and After to the same session. You should see the message instead.
4. Open the compare screen for "Practice group", which has one session. You should see the message.
5. Open the compare screen for "Test club". Nobody came to both sessions, so the counts are 0, the averages say "n/a", and there's no warning.
6. Look at it at phone size.

**Your call:** what comes first on the screen. The warning is the most important thing here, so it might belong at the top.

**In your PR:** At Fake site session 2, the Q4 average for everyone who answered is 5.00, and for the kids who came both times it's also 5.00. When would those two numbers be different, and which one should a leader trust?

# Test the whole app

This is the final test, like the end of a class project. You'll use the app the way a leader and their kids will: set up a group, run two sessions, and check that every screen shows the right thing. The answers below are chosen so we know exactly what each screen should show.

Do it on the live site once everything is merged: https://connection-app-alpha.vercel.app. Do the check-ins on your phone if you can, like a real group would.

Keep a test log as you go. Make a new issue on GitHub called "Final test", copy this whole section into it, and tick each box as it passes. If something doesn't match, write down what you expected and what you saw. Then fix it on a branch, merge the fix, and test that part again.

### Part 1: Set up a group

- [ ] On the groups screen, add a group called "Final test", ages 11-13, program type After school.
- [ ] Add six kids: Ana, Ben, Cara, Dev, Eli and Fay.

### Part 2: Session 1

- [ ] Start a session with the activity "Pairs".
- [ ] Mark all six kids as here, and save.
- [ ] Start check-ins, and check in these five kids. Fay doesn't check in. Each kid is also asked who they knew before joining: tap anyone you like, since it doesn't change the numbers.

| Kid | Worked with | Talked to | Q4 | Q5 | Stayed whole | First time |
|---|---|---|---|---|---|---|
| Ana | Ben, Cara | Cara | 5 | 4 | Yes | Yes |
| Ben | nobody | Ana | 4 | 3 | Yes | Yes |
| Cara | nobody | Dev | 6 | 5 | Yes | Yes |
| Dev | nobody | nobody | Skip | Skip | Yes | Yes |
| Eli | nobody | nobody | 3 | 2 | Yes | Yes |

- [ ] The session screen says "5 of 6 checked in", with Fay not checked in yet.

### Part 3: Session 2

- [ ] Start a second session, with the activity "Small groups (kids chose)".
- [ ] Mark Ana, Ben, Cara, Dev and Eli as here, but not Fay.
- [ ] On the check-in screen, Fay isn't on the list.
- [ ] Check in these five kids. Nobody is asked who they knew before, because they all answered that in session 1. Each kid gets 6 questions instead of 7.

| Kid | Worked with | Talked to | Q4 | Q5 | Stayed whole | First time |
|---|---|---|---|---|---|---|
| Ana | Ben | Dev | 6 | 5 | Yes | No |
| Ben | Ana | Cara | 5 | 4 | Yes | No |
| Cara | nobody | Ben | 6 | 4 | Yes | No |
| Dev | nobody | Ana, Cara | 4 | 3 | Yes | No |
| Eli | nobody | nobody | 4 | 3 | Yes | No |

### Part 4: Results

- [ ] Both sessions' numbers match this table. Session 1 is the tiny example, so it should look familiar.

| On the screen | Session 1 | Session 2 |
|---|---|---|
| kids here | 6 | 5 |
| checked in | 5 | 5 |
| links | 3 | 4 |
| density | 0.20 | 0.40 |
| no links (isolates) | 1 | 1 |
| didn't answer (unknown) | 1 | 0 |
| centralization | 0.30 | 0.17 |
| average links | 1.0 | 1.6 |
| Q4 average | 4.50 (4 answered) | 5.00 (5 answered) |
| Q5 average | 3.50 (4 answered) | 3.80 (5 answered) |

- [ ] Who to check on, session 1: Eli ("No connections this session"), then Fay ("Didn't fill in the check-in").
- [ ] Who to check on, session 2: Eli ("No connections this session and last session").
- [ ] Session 1's picture has 3 lines: Ana-Ben, Ana-Cara and Cara-Dev. Eli and Fay have no lines, and their dots are different colors.
- [ ] Session 2's picture has 4 lines: Ana-Ben, Ana-Dev, Ben-Cara and Cara-Dev. Fay has no dot, and nobody else has moved.

### Part 5: Compare

- [ ] With session 1 as Before and session 2 as After:
  - kids at both sessions: 5
  - new links: 2, highlighted in the After picture: Ana-Dev and Ben-Cara
  - lost links: 1 (Ana-Cara)
  - still isolated: 1 (Eli)
  - Q4: 4.50 before, 5.25 after, change +0.75, 4 kids
  - Q5: 3.50 before, 4.00 after, change +0.50, 4 kids
  - the warning "Average Q4 rose by 0.75 and average Q5 rose by 0.50, but 1 person was isolated in both sessions."

Q4 and Q5 count 4 kids, not 5, because Dev skipped them in session 1.

### Part 6: Changing things

- [ ] Check Ben in again for session 2, with the same answers except Q4 = 7. The app asks before replacing his answers.
- [ ] Session 2's results still say 5 checked in, and the Q4 average is now 5.40.
- [ ] On the compare screen, Q4 is now 4.50 before and 5.75 after, a change of +1.25, and the warning says "rose by 1.25".
- [ ] On session 2's session screen, untick Eli and save. The warning about Eli appears. Tick him again and save.
- [ ] A check-in with no internet: open session 2's check-in on your phone and tap Dev (say yes to starting again). Then turn on airplane mode, and answer exactly as in Part 3. At the end it should say "That didn't save". Turn airplane mode off and tap "Try again". It should save, and since Dev gave the same answers, session 2's numbers shouldn't change.

### Part 7: Every screen

- [ ] You can get from the home page to every screen by tapping links, without typing any addresses.
- [ ] Every screen looks right at phone size.
- [ ] Each screen shows a clear message, not a blank page, when its address is missing the group: try `ui/group.html`, `ui/session.html`, `ui/results.html` and `ui/compare.html` with nothing after them.
- [ ] "Fake site (test data)" still matches the tables in steps 14 and 16.

### Part 8: Clean up

- [ ] In the Supabase Table Editor, open the `groups` table and delete "Final test" and "My test group". Deleting a group also deletes its kids, sessions and answers. Leave the other groups.

When every box is ticked, message me, and we'll show the app to Irene.

## What's next

Once the final test passes, the app is ready to show Irene. The outline has ideas for what could come after that: which kinds of activities create the most new links, suggesting groups for the next session, and trends across all of a group's sessions.
