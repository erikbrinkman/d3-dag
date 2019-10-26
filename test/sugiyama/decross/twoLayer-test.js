const tape = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("decrossTwoLayer() default works for grafo", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer())
    .coord(d3_dag.coordCenter())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  test.ok(dag.every(({ x }) => 0 <= x <= 140));
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
  test.ok(dag.every(({ x }) => 0 <= x <= 140));
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
  test.ok(dag.every(({ x }) => 0 <= x <= 140));
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
  test.ok(dag.every(({ x }) => 0 <= x <= 140));
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
    d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt().debug(true))
  )(dag);
  const debug = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  test.allClose(original, debug);
  test.end();
});
