# Connected compared with Network Canvas, NetworkX and Gephi

Valente suggested checking Connected against existing tools. This covers the
three references in Irene's next-steps doc: how
[Network Canvas](https://networkcanvas.com/) asks about relationships, whether
Connected's numbers match [NetworkX](https://networkx.org/), and how to load
Connected's networks into [Gephi](https://gephi.org/) to compare the pictures.

## Question design: Network Canvas

Network Canvas is free software for collecting network data in interviews.
Its [roster name generator](https://documentation.networkcanvas.dev/en/design-protocols/interface-documentation/name-generator-roster)
shows a list of people (a roster) and the participant picks who fits each
prompt.

| | Network Canvas | Connected | Difference |
|---|---|---|---|
| Who is answering | An "identify yourself" stage: pick yourself from the roster (minimum and maximum of 1) | Tap your name on the list of kids marked as here | Same idea. Groups that can't collect names skip it |
| Naming people | One prompt per relationship, picking from a roster | One question per relationship (worked with, talked to, knew before), tapping names from the kids who are here | Same idea. Connected's roster is only the kids at that session |
| Naming nobody | Each stage can set a minimum and maximum number of people. With no minimum, a participant can move on with nobody picked, which (as far as the documentation shows) is stored the same way as not answering: no people for that prompt | A **Nobody** button. Moving on without picking anyone is recorded as a skip | Connected records the difference, so "nobody" and "skipped" never get mixed up |
| Kinds of relationship | Each prompt can make a different edge type | Worked with, talked to and knew before are kept as separate yes/no answers | Same. Connected's numbers use "worked with or talked to"; the exports keep each kind apart and labelled |
| Ties between other people | A sociogram where the participant draws ties between people they named | Not asked. Kids only report their own ties | Connected's network is built from everyone's own reports (a whole-group network), not one person's view of everyone |
| Export | CSV and GraphML files per interview | CSV report (group-level numbers) and a GEXF network file per session | Different formats; both open in Gephi |

What Connected took from this: the explicit Nobody answer (item 6 in
`docs/survey-comparison.md`), one prompt per relationship, and keeping each
relationship as its own labelled network.

## Calculations: NetworkX

`tools/public-data/` runs Connected's own `core/` code, then rebuilds every
network separately with NetworkX (from the raw ticks, and straight from the
downloaded files for the public data) and compares every number. Run it with
the commands in `tools/public-data/README.md`. Results on 23 November 2026:

| Network | People | Links (Connected / NetworkX) | Density | Centralization | Degree 0: no reported connections + unknown = NetworkX isolates | Every degree matches |
|---|---|---|---|---|---|---|
| Known answer (made up, worked out by hand) | 6 | 2 / 2 | 0.1333 / 0.1333 | 0.4000 / 0.4000 | 1 + 2 = 3 | yes |
| Known answer, talked to only | 6 | 2 / 2 | 0.1333 / 0.1333 | 0.4000 / 0.4000 | 2 + 1 = 3 | yes |
| Tiny example from docs/build-steps.md | 6 | 3 / 3 | 0.2000 / 0.2000 | 0.3000 / 0.3000 | 1 + 1 = 2 | yes |
| Fake site, session 1 | 20 | 19 / 19 | 0.1000 / 0.1000 | 0.5322 / 0.5322 | 2 + 1 = 3 | yes |
| Fake site, session 2 | 16 | 22 / 22 | 0.1833 / 0.1833 | 0.6286 / 0.6286 | 2 + 1 = 3 | yes |
| SocioPatterns 2013: friendship named in a survey | 329 | 406 / 406 | 0.0075 / 0.0075 | 0.0446 / 0.0446 | 0 + 195 = 195 | yes |
| SocioPatterns 2013: contact reported in a diary | 329 | 348 / 348 | 0.0064 / 0.0064 | 0.0303 / 0.0303 | 0 + 209 = 209 | yes |
| SocioPatterns 2013: Facebook friends (where known) | 329 | 1437 / 1437 | 0.0266 / 0.0266 | 0.1235 / 0.1235 | 0 + 173 = 173 | yes |
| SocioPatterns 2013: near each other (sensors) | 329 | 5818 / 5818 | 0.1078 / 0.1078 | 0.1584 / 0.1584 | 0 + 2 = 2 | yes |

Everything matches: number of people, links, density (`nx.density`), each
kid's number of links (`G.degree`), Freeman degree centralization worked out
from those degrees, and average links per kid. The known-answer group
(`tests/fixtures/known-answer.js`) was also worked out by hand, and
`npm test` checks Connected gets the hand-worked answers.

The public-data counts also match the published paper (Mastrandrea et al.,
2015): 327 students with sensor contacts and 5,818 contact pairs; 120
students who filled in a diary; 156 students with Facebook data and 1,437
Facebook links; and a friendship network of 134 students and 406 links. The
paper says 135 students answered the friendship survey, but only 134 appear
in the file: the student who answered without naming anyone can't be found
from the links alone. That is exactly why Connected now records "Nobody"
separately from skipping.

### Differences that are on purpose, not errors

- **Isolates.** NetworkX calls every person with no links an isolate.
  Connected splits them in two: "no reported connections" (they answered the
  who-questions, with names or Nobody, and nobody named them) and "unknown"
  (they skipped, were away, or didn't check in). The two always add up to
  NetworkX's count, as the table shows. This is why the friendship and diary
  networks have 0 "no reported connections": those files only list students
  who named someone, so a student who answered "nobody" can't be told apart
  from one who didn't answer, and Connected won't guess.
- **Direction.** Kids' reports have a direction (Ana named Ben). Connected
  links a pair if either kid named the other, which is NetworkX's
  `to_undirected()` on the reports. It doesn't measure whether ties are
  returned (reciprocity).
- **Everyone is kept.** Every kid marked as here is a node, even with no
  links, so density and averages are out of the whole group.

No calculation errors were found. The only changes were the skipped-versus-
nobody rule and the labels, which were design problems rather than maths.

## Pictures: Gephi

The group report has a **Download GEXF** button for sessions that ask who
kids worked with or talked to. Each file holds one kind of connection (worked
with or talked to, worked with, talked to, or knew before), with everyone
marked as here as a node. Kids are numbered ("Kid 1", "Kid 2", ...), never
named. Groups with leader support also get each kid's status (connected, no
reported connections, unknown) as a node attribute; group-only groups don't.
`tools/public-data/` writes the same kind of file for each SocioPatterns
relationship (`output/sociopatterns-*.gexf`).

To compare with Gephi (desktop app, free):

1. **File > Open** the `.gexf` file and keep it as an undirected graph.
2. In **Statistics**, run **Average Degree** and **Graph Density**. The
   number of nodes and edges (top right) should match the report's "Kids
   here" and "Connections", average degree should match "Connections per
   kid, on average", and density should match "Share of possible pairs who
   connected".
3. For the picture, use **Layout > Circular Layout** to match Connected's
   circle, or **ForceAtlas 2** to see clusters. Colour nodes by the `status`
   attribute (Appearance > Nodes > Partition) when it's there.

Gephi wasn't available where these checks were run, so the GEXF files were
read back with NetworkX's GEXF reader instead: node and edge counts and
density matched for all four SocioPatterns files. Opening one in Gephi is a
good five-minute check for Subin.
