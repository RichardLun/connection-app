"""Checks Connected's network numbers against NetworkX.

Run tools/public-data/sociopatterns.mjs first. It writes Connected's results
to output/connected-results.json. This script builds each network again
with NetworkX, from the raw ticks for the made-up groups and straight from
the downloaded SocioPatterns files for the public data, so the two sides
share no code. Every count and statistic must match.

    /path/to/python-with-networkx tools/public-data/networkx_check.py
"""

import json
import sys
from pathlib import Path

import networkx as nx

HERE = Path(__file__).parent
DATA = HERE / "data"
OUTPUT = HERE / "output"


def rows(name):
    with open(DATA / name, encoding="utf-8") as f:
        return [line.split() for line in f if line.strip()]


def sociopatterns_graph(relation):
    """The relationship as an undirected graph over every student in the metadata."""
    graph = nx.Graph()
    graph.add_nodes_from(f"s{row[0]}" for row in rows("HighSchool2013_metadata.txt"))
    if relation in ("friendship", "diaries"):
        name = {"friendship": "HighSchool2013_friendship_network.csv",
                "diaries": "HighSchool2013_contactdiaries_network.csv"}[relation]
        edges = [(f"s{r[0]}", f"s{r[1]}") for r in rows(name)]
    elif relation == "facebook":
        edges = [(f"s{r[0]}", f"s{r[1]}") for r in rows("HighSchool2013_facebook_known_pairs.csv") if r[2] == "1"]
    else:
        edges = [(f"s{r[1]}", f"s{r[2]}") for r in rows("HighSchool2013_proximity_net.csv")]
    graph.add_edges_from((a, b) for a, b in edges if a != b)
    return graph


def fixture_graph(data):
    """Connected's rule from the raw ticks: a link if either kid reported the other,
    only between kids who were there."""
    graph = nx.Graph()
    graph.add_nodes_from(data["input"]["nodes"])
    nodes = set(data["input"]["nodes"])
    graph.add_edges_from((a, b) for a, b in data["input"]["reports"] if a != b and a in nodes and b in nodes)
    return graph


def freeman_centralization(graph):
    n = graph.number_of_nodes()
    if n < 3:
        return None
    degrees = [d for _, d in graph.degree()]
    return sum(max(degrees) - d for d in degrees) / ((n - 1) * (n - 2))


def close(a, b):
    return (a is None and b is None) or (a is not None and b is not None and abs(a - b) < 1e-12)


def main():
    results = json.loads((OUTPUT / "connected-results.json").read_text())
    lines = [
        "| Network | People | Links (Connected / NetworkX) | Density | Centralization | "
        "Degree-0: no reported connections + unknown = NetworkX isolates | Every degree matches |",
        "|---|---|---|---|---|---|---|",
    ]
    problems = 0
    for key, data in results.items():
        graph = sociopatterns_graph(key.split()[-1]) if key.startswith("sociopatterns") else fixture_graph(data)
        c = data["connected"]
        n = graph.number_of_nodes()
        density = nx.density(graph) if n >= 2 else None
        centralization = freeman_centralization(graph)
        degrees_match = c["degree"] == dict(graph.degree())
        isolates = nx.number_of_isolates(graph)
        checks = [
            c["present"] == n,
            c["links"] == graph.number_of_edges(),
            close(c["density"], density),
            close(c["centralization"], centralization),
            close(c["averageLinks"], 2 * graph.number_of_edges() / n if n else None),
            c["isolates"] + c["unknown"] == isolates,
            degrees_match,
            all(graph.degree(node) > 0 for node, s in c["status"].items() if s == "connected"),
        ]
        ok = all(checks)
        problems += not ok
        lines.append(
            f"| {data['label']} | {n} | {c['links']} / {graph.number_of_edges()} | "
            f"{c['density']:.4f} / {density:.4f} | "
            + (f"{c['centralization']:.4f} / {centralization:.4f}" if centralization is not None else "n/a")
            + f" | {c['isolates']} + {c['unknown']} = {isolates} | {'yes' if degrees_match else 'NO'} |"
            + ("" if ok else " **MISMATCH**")
        )
    table = "\n".join(lines)
    print(table)
    (OUTPUT / "comparison.md").write_text(table + "\n")
    print("\nAll numbers match NetworkX." if problems == 0 else f"\n{problems} network(s) differ from NetworkX.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
