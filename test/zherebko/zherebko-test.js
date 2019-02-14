const tape = require("../close"),
  load = require("../load"),
  d3_dag = require("../../");

tape("zherebko() works for grafo", (test) => {
  const dag = load("grafo");
  const nodesBefore = dag.size();
  d3_dag.zherebko().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.end();
});

tape("zherebko() works for square", (test) => {
  const dag = load("square");
  d3_dag.zherebko().size([1, 3])(dag);
  const ordered = dag
    .descendants()
    .sort((a, b) => a.id.charCodeAt(0) - b.id.charCodeAt(0));
  test.allClose(ordered.map((n) => n.y), [0, 2, 1, 3]); // Britle, could also be 0, 1, 2, 3
  test.allClose(ordered.map((n) => n.x), [0, 0, 0, 0]);
  const orderedLinks = dag
    .links()
    .sort(({ source: sa, target: ta }, { source: sb, target: tb }) => {
      return (
        (sa.id.charCodeAt(0) - sb.id.charCodeAt(0)) * dag.size() +
        (ta.id.charCodeAt(0) - tb.id.charCodeAt(0))
      );
    });
  test.allClose(
    orderedLinks.flatMap(({ data }) => data.points.map((p) => p.x)),
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
  ); // Fragile, flip sets of 0s and 1s
  test.allClose(
    orderedLinks.flatMap(({ data }) => data.points.map((p) => p.y)),
    [0, 1, 2, 0, 1, 2, 3, 1, 2, 3],
  ); // Fragile, flip sets of 0s and 1s
  test.end();
});
