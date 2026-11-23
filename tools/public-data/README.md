# Checking Connected's numbers with public data

Two scripts check that Connected's calculations (`core/network.js` and
`core/numbers.js`) give the same counts and statistics as
[NetworkX](https://networkx.org/), first on small made-up groups whose
answers were worked out by hand, then on real public data.
`docs/reference-comparison.md` explains the results.

```
node tools/public-data/sociopatterns.mjs
/Users/richard/irene-code/group-connection/.venv/bin/python tools/public-data/networkx_check.py
```

Any Python with `networkx` installed works for the second line. The first
script downloads the data once into `data/` and writes Connected's results to
`output/connected-results.json`, plus one Gephi file per relationship
(`output/sociopatterns-*.gexf`). The second builds every network again with
NetworkX, straight from the raw files, and prints a table (also saved as
`output/comparison.md`). It exits with an error if any number differs.

## The data

High school contact and friendship networks, Lycée Thiers, Marseilles,
December 2013, from [SocioPatterns](https://sociopatterns.org/datasets/high-school-contact-and-friendship-networks/).
329 students in the metadata. Four different relationships:

| File | What it records | What it doesn't show |
|---|---|---|
| Contact diaries | Student *i* wrote that they had contact with *j* (directed, with a duration) | Who filled in a diary but named nobody |
| Friendship survey | Student *i* named *j* as a friend (directed) | Who answered but named nobody |
| Facebook known pairs | Whether *i* and *j* are Facebook friends, for students who shared it | Anything about the students who didn't share |
| Proximity sensors | *i* and *j* were near each other (face to face, within about 1.5 m) in a 20-second window | Whether they were friends, or felt they belonged |

Each relationship is checked on its own and labelled. Being near someone
isn't friendship, and neither tells us whether a student feels they belong.

Every student in the metadata is kept as a node, even with no links. A
student only counts as "no reported connections" when we know they answered
(for example, they appear in the Facebook pairs but have no friends there).
Students whose answer we don't have stay "unknown". In the friendship and
diary files only students who named someone appear, so every student with no
links is unknown, not isolated.

## Licence

The data is © SocioPatterns and is shared under the
[Creative Commons Attribution-NonCommercial-ShareAlike 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)
licence. It is downloaded when the script runs and is never committed to this
repository. If you use it in a paper, presentation or picture, cite:

R. Mastrandrea, J. Fournet and A. Barrat, *Contact patterns in a high school:
a comparison between data collected using wearable sensors, contact diaries
and friendship surveys*, PLoS ONE 10(9): e0136497 (2015).
https://doi.org/10.1371/journal.pone.0136497
