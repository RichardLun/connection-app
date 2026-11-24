// Runs Connected's own calculations (core/) on SocioPatterns' public
// high-school data (Lycée Thiers, Marseilles, December 2013), one kind of
// relationship at a time, and on the made-up groups whose answers we know.
// networkx_check.py then checks every number against NetworkX.
// README.md in this folder explains why, and the data's licence.
//
//   node tools/public-data/sociopatterns.mjs          (downloads the data once)
//   python tools/public-data/networkx_check.py
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildNetwork } from "../../core/network.js";
import { sessionNumbers } from "../../core/numbers.js";
import { sessionGexf } from "../../core/exports.js";
import { knownAnswerGroup } from "../../tests/fixtures/known-answer.js";
import { tinyGroup } from "../../tests/fixtures/tiny-group.js";

const here = new URL(".", import.meta.url);
const dataDir = new URL("data/", here);
const outDir = new URL("output/", here);
const SOURCE = "https://sociopatterns.org/assets/data/";
const FILES = {
  metadata: "HighSchool2013_metadata.txt",
  proximity: "HighSchool2013_proximity_net.csv.gz",
  diaries: "HighSchool2013_contactdiaries_network.csv.gz",
  friendship: "HighSchool2013_friendship_network.csv.gz",
  facebook: "HighSchool2013_facebook_known_pairs.csv.gz",
};

// Each relationship is a separate network with its own label. Being near
// someone (proximity) isn't friendship, and neither proves belonging.
// "answered" says whose answer we know, so a student with no links is only
// counted as "no reported connections" when their answer is known.
const RELATIONS = {
  friendship: {
    label: "Friendship named in a survey (directed: i named j)",
    answered: "Only students who named at least one friend appear in the file, so a student who answered and named nobody can't be told apart from one who skipped. They count as unknown.",
  },
  diaries: {
    label: "Contact reported in a diary (directed: i reported contact with j, any duration)",
    answered: "As for friendship: only students who reported someone appear, so the rest are unknown.",
  },
  facebook: {
    label: "Facebook friends (undirected, w = 1), among pairs where it's known",
    answered: "Students in any known pair shared their Facebook data, so a student with only w = 0 pairs has no Facebook friends here. Students in no pair are unknown.",
  },
  proximity: {
    label: "Physically near each other, from wearable sensors (any 20-second contact over 5 days)",
    answered: "Students who appear in the sensor data took part. Students in the metadata who never appear are unknown.",
  },
};

async function download() {
  mkdirSync(dataDir, { recursive: true });
  for (const name of Object.values(FILES)) {
    const target = new URL(name.replace(/\.gz$/, ""), dataDir);
    if (existsSync(target)) continue;
    const response = await fetch(SOURCE + name);
    if (!response.ok) throw new Error(`Couldn't download ${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(target, name.endsWith(".gz") ? gunzipSync(bytes) : bytes);
    console.log(`downloaded ${name}`);
  }
}

function rows(key) {
  const text = readFileSync(new URL(FILES[key].replace(/\.gz$/, ""), dataDir), "utf8");
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.trim().split(/\s+/));
}

// One Connected group per relationship: every student in the metadata is
// "here" (the full participant list), the relationship goes in as
// "worked with" ticks, and each student whose answer is known gets
// "named" or "none".
function relationGroup(relation) {
  const people = rows("metadata").map(([id]) => ({ id: `s${id}`, name: `s${id}` }));
  const ticks = [];
  const answered = new Set();
  if (relation === "friendship" || relation === "diaries") {
    for (const [i, j] of rows(relation)) {
      ticks.push({ from: `s${i}`, to: `s${j}`, workedWith: true, talkedTo: false, knewBefore: false });
      answered.add(`s${i}`);
    }
  } else if (relation === "facebook") {
    for (const [i, j, w] of rows("facebook")) {
      answered.add(`s${i}`).add(`s${j}`);
      if (w === "1") ticks.push({ from: `s${i}`, to: `s${j}`, workedWith: true, talkedTo: false, knewBefore: false });
    }
  } else {
    const seen = new Set();
    for (const [, i, j] of rows("proximity")) {
      answered.add(`s${i}`).add(`s${j}`);
      const key = [i, j].sort().join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      ticks.push({ from: `s${i}`, to: `s${j}`, workedWith: true, talkedTo: false, knewBefore: false });
    }
  }
  const named = new Set(ticks.map((t) => t.from));
  const ids = new Set(people.map((p) => p.id));
  // Kept, not dropped: anyone in the relationship data missing from the metadata.
  for (const id of [...answered, ...ticks.map((t) => t.to)]) {
    if (!ids.has(id)) { people.push({ id, name: id }); ids.add(id); }
  }
  return {
    id: relation,
    name: `SocioPatterns high school 2013: ${relation}`,
    checkInMode: "names_and_interactions",
    reportPrivacy: "leader_support",
    people,
    sessions: [{
      number: 1,
      date: "2013-12-02",
      questions: ["worked_with"],
      present: people.map((p) => p.id),
      ticks,
      answers: [...answered].map((id) => ({ personId: id, workedWithStatus: named.has(id) ? "named" : "none" })),
    }],
  };
}

// The raw input and Connected's results for one network. The Python check
// builds its own graph from the raw input, so it doesn't reuse Connected's.
function result(label, group, sessionNumber, relation, note = null) {
  const network = buildNetwork(group, sessionNumber, { relation });
  const session = group.sessions.find((s) => s.number === sessionNumber);
  const tickFields = { either: ["workedWith", "talkedTo"], worked: ["workedWith"], talked: ["talkedTo"], knew: ["knewBefore"] }[relation];
  return {
    label,
    note,
    input: {
      nodes: session.present,
      reports: session.ticks.filter((t) => tickFields.some((f) => t[f])).map((t) => [t.from, t.to]),
    },
    connected: {
      ...sessionNumbers(group, sessionNumber, { relation }),
      degree: network.degree,
      status: network.status,
    },
  };
}

await download();
mkdirSync(outDir, { recursive: true });
const fakeSite = JSON.parse(readFileSync(new URL("../../tests/fixtures/fake-site.json", here), "utf8"));
const results = {
  "known answer, session 1 (worked or talked)": result("Known answer (made up, worked out by hand)", knownAnswerGroup(), 1, "either"),
  "known answer, session 1 (talked only)": result("Known answer, talked to only", knownAnswerGroup(), 1, "talked"),
  "tiny example (worked or talked)": result("Tiny example from docs/build-steps.md", tinyGroup(), 1, "either"),
  "fake site, session 1": result("Fake site, session 1", fakeSite, 1, "either"),
  "fake site, session 2": result("Fake site, session 2", fakeSite, 2, "either"),
};
for (const [relation, info] of Object.entries(RELATIONS)) {
  const group = relationGroup(relation);
  results[`sociopatterns ${relation}`] = result(info.label, group, 1, "worked", info.answered);
  writeFileSync(new URL(`sociopatterns-${relation}.gexf`, outDir), sessionGexf(group, 1, "worked"));
}
writeFileSync(new URL("connected-results.json", outDir), JSON.stringify(results, null, 1));
for (const [name, r] of Object.entries(results)) {
  const n = r.connected;
  console.log(`${name}: ${n.present} people, ${n.links} links, density ${n.density?.toFixed(4)}, ` +
    `no reported connections ${n.isolates}, unknown ${n.unknown}`);
}
console.log("Wrote tools/public-data/output/connected-results.json and one GEXF per SocioPatterns relationship.");
