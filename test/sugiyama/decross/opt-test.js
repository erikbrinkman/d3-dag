const tape = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

function orientation(px, py, qx, qy, rx, ry) {
  /// Returns the orientation of three ordered points assuming they're not colinear
  return (qy - py) * (rx - qx) - (qx - px) * (ry - qy) > 0;
}

function intersect(p1x, p1y, p2x, p2y, q1x, q1y, q2x, q2y) {
  /// returns true if line segments p1-p2 and q1-q2 intersect, doesn't handle degenerate cases
  return (
    orientation(p1x, p1y, p2x, p2y, q1x, q1y) !=
      orientation(p1x, p1y, p2x, p2y, q2x, q2y) &&
    orientation(q1x, q1y, q2x, q2y, p1x, p1y) !=
      orientation(q1x, q1y, q2x, q2y, p2x, p2y)
  );
}

tape("decrossOpt() works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.allClose(ordered.map((n) => n.y), [
    3,
    4,
    2,
    4,
    2,
    5,
    5,
    5,
    2,
    3,
    5,
    3,
    1,
    3,
    5,
    4,
    4,
    4,
    4,
    3,
    4,
    0
  ]);
  // quadratic time crossing counter
  const crossings = dag.links().reduce((s1, l1, i) => {
    return (
      s1 +
      dag
        .links()
        .slice(i + 1)
        .reduce((s2, l2) => {
          return (
            s2 +
            intersect(
              l1.source.x,
              l1.source.y,
              l1.target.x,
              l1.target.y,
              l2.source.x,
              l2.source.y,
              l2.target.x,
              l2.target.y
            )
          );
        }, 0)
    );
  }, 0);
  test.equal(crossings, 14, "didn't optimize crossings for layering");
  test.end();
});

tape("decrossOpt() debug works for well behaved node names", (test) => {
  const layout = d3_dag.sugiyama().decross(d3_dag.decrossOpt());
  const dag = layout(load("grafo"));
  const normal = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  layout.decross(d3_dag.decrossOpt().debug(true))(dag);
  const debug = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  test.allClose(normal, debug);
  test.end();
});
