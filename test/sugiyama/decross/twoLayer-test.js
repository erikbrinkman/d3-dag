const tape = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// These tests are fragile as there are many possible configurations and not
// many invariants to acurately exploit.

tape("decrossTwoLayer() default works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer())
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.allClose(ordered.map((n) => n.x), [
    63,
    28,
    63,
    84,
    105,
    98,
    42,
    70,
    49,
    119,
    84,
    77,
    84,
    105,
    56,
    14,
    70,
    42,
    140,
    35,
    112,
    70,
  ]);
  test.end();
});

tape("decrossTwoLayer() median works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMedian()))
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.allClose(ordered.map((n) => n.x), [
    63,
    28,
    63,
    84,
    105,
    98,
    42,
    70,
    49,
    119,
    84,
    77,
    84,
    105,
    56,
    14,
    70,
    42,
    140,
    35,
    112,
    70,
  ]);
  test.end();
});

tape("decrossTwoLayer() mean works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMean()))
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.allClose(ordered.map((n) => n.x), [
    63,
    28,
    63,
    84,
    105,
    98,
    70,
    56,
    49,
    119,
    84,
    77,
    84,
    105,
    42,
    14,
    70,
    42,
    140,
    35,
    112,
    70,
  ]);
  test.end();
});

tape("decrossTwoLayer() opt works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt()))
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.allClose(ordered.map((n) => n.x), [
    35,
    140,
    91,
    98,
    77,
    56,
    84,
    70,
    35,
    77,
    42,
    105,
    84,
    119,
    98,
    126,
    14,
    84,
    70,
    91,
    112,
    70,
  ]);
  test.end();
});

tape("decrossTwoLayer() opt debug is identical", (test) => {
  const layout = d3_dag
    .sugiyama()
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt()));
  const dag = layout(load("grafo"));
  const original = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  layout.decross(
    d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt().debug(true)),
  )(dag);
  const debug = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  test.allClose(original, debug);
  test.end();
});
