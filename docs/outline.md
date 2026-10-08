# Project outline

This is the big picture: what we're building, what it will do, and how we'll work together. Read it through and add your comments as you go. If something doesn't make sense, or you'd do something differently, say so. Once we're both happy with it, I'll send you the step-by-step guide.

## What we're building

A web app that helps people who run youth groups see whether the kids in their group are actually connecting with each other.

At the end of each session, each kid spends a couple of minutes on the leader's phone or laptop. They tap the names of the kids they worked with and the kids they talked to. Then they answer two questions:
- Q4: how close they feel to the group, on a scale of 1 to 7
- Q5: how much they feel they belong, on a scale of 1 to 5

The leader then sees:
- a picture of who connected with whom
- a few key numbers
- which kids might need help connecting
- what changed since the last session

Everything is saved in a database (Supabase). Once we have permission, we'll use this data in a research paper about what helps youth groups connect.

## Why it matters

Programs usually check on this by asking each kid how connected they feel, and averaging the answers. The trouble is that averages hide people. The average can look great while two kids sit alone every week.

This app also records what actually happened: who worked with and talked to whom. So the leader sees both. When the two disagree, the app points it out, for example if ratings go up while the same kids stay on their own.

## A note before you start

You won't be typing most of the code for this project yourself. I want to explain why up front, because it might feel strange at first.

Writing code with AI tools like Claude Code is now standard practice in the software industry, and it's how most engineers work today. They figure out what needs to be built, break it into small pieces, describe each piece clearly, and then read, test and fix what the tool writes. The engineer is still responsible for the code. That's the job you'll be doing here.

We're also on a short timeline. We want a working app in two to three weeks, so we're going to lean on Claude Code a lot. What matters most is that you understand what the code does. If anything is unclear, even one line, ask Claude Code to explain it, and message me. No question is too small.

## What the app will do

**For kids,** at the end of each session, in about two minutes:
- tap who they worked with, and who they talked to
- the first time they check in, tap who they already knew before joining
- answer Q4 and Q5
- answer two yes/no questions: did they stay for the whole session, and was it their first time

**For the leader:**
- set up their group once: the kids' names, their ages, and what kind of program it is
- start each session, pick what kind of activity the group did, and mark who's here
- see the results: a picture of who connected with whom, a few key numbers, and a list of kids who might need help connecting
- compare two sessions: new connections, kids who are still on their own, and whether the ratings changed for the kids who came both times
- get a warning when the ratings and the connections tell different stories

**For the research:** everything is saved in the database. Once we have permission, we can study which kinds of activities help kids connect.

## What gets saved

The database has six tables:
- **groups:** each youth group, with the kids' age range and the type of program
- **people:** the kids in each group
- **sessions:** each time a group meets, with the date and what kind of activity they did
- **attendance:** who was at each session
- **answers:** each kid's check-in answers (Q4, Q5 and the two yes/no questions)
- **ticks:** each person a kid tapped, and whether they worked together, talked, or knew each other before

## How we'll build it

The app has two halves:
- The frontend is the screens people see and tap.
- The backend is everything behind the screens: saving and loading data, and doing the calculations.

We're building the backend first. Here's what it covers, one step at a time:

1. Saving groups and the kids in them
2. Starting sessions, and recording who came
3. Saving a kid's check-in
4. Loading everything about a group in one go
5. Working out who is connected to whom
6. The numbers for a session
7. A big test that checks our maths against the research version
8. Comparing two sessions
9. The list of kids to check on
10. Where each kid's dot goes in the picture

Once the backend is done, we'll sit down together and plan the frontend: the screens that leaders and kids will actually use.

Some ideas for after that:
- showing which kinds of activities create the most new connections
- suggesting groups for the next session, to mix kids who haven't worked together
- trends across all of a group's sessions, not just two
- spotting cliques: kids who only ever stick together

## What's already set up

I've set up the infrastructure, so you can focus on the app itself:
- **Supabase database:** the six tables above.
- **`lib/supabase.js`:** the file that connects the app to the database.
- **Vercel:** puts the app online. Every pull request gets its own preview link, and the live site updates whenever a pull request is merged.
- **Test data:** a made-up group of 20 kids, with known right answers for every number.

## How we'll work together

1. The backend is broken into small steps. Each one becomes a pull request (PR): a request for me to review your changes before they're added to the main code.
2. For each step, you give Claude Code a prompt from the guide, read its plan, let it make the changes, and test them the way the step describes.
3. Then you open a PR. In its description, you answer a couple of questions about the step, so we both know you understand what was built.
4. Vercel puts every PR online as a preview, so you can click through your changes. I use the same link when I review.
5. I'll review within a day or so. Once I approve it, you merge it and move on to the next step.

If you're stuck for more than half an hour, message me.

## Your comments

Write anything here: questions, things that don't make sense, ideas, or things you'd change.

-
