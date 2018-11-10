const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// These tests are fragile as there are many possible configurations and not
// many invariants to acurately exploit.

/// One of expected is close to actual
function oneClose(actual, ...expected) {
  return expected.some(expect => expect.every((v, i) => close(actual[i], v)));
}

tape("decrossTwoLayer() default works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer())
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  const expected1 = [60, 14, 56, 84, 140, 140, 35, 70, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  const expected2 = [60, 28, 56, 84, 140, 140, 0, 70, 28, 140, 105, 80, 140, 120, 35, 14, 70, 42, 140, 20, 112, 70];
  test.ok(oneClose(ordered, expected1, expected2))
  test.end();
});

tape("decrossTwoLayer() median works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMedian()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  const expected1 = [60, 14, 56, 84, 140, 140, 35, 70, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  const expected2 = [60, 28, 56, 84, 140, 140, 0, 70, 28, 140, 105, 80, 140, 120, 35, 14, 70, 42, 140, 20, 112, 70];
  test.ok(oneClose(ordered, expected1, expected2))
  test.end();
});

tape("decrossTwoLayer() mean works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMean()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  const expected1 = [60, 14, 56, 84, 140, 140, 70, 35, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  const expected2 = [60, 28, 56, 84, 140, 140, 70, 35, 28, 140, 105, 80, 140, 120, 0, 14, 70, 42, 140, 20, 112, 70];
  test.ok(oneClose(ordered, expected1, expected2))
  test.end();
});

tape("decrossTwoLayer() opt works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  const expected1 = [20, 140, 112, 98, 84, 35, 105, 70, 0, 80, 0, 120, 140, 140, 140, 126, 14, 84, 70, 100, 112, 70];
  test.ok(oneClose(ordered, expected1))
  test.end();
});

tape("decrossTwoLayer() opt debug is identical", test => {
  const layout = d3_dag.sugiyama()
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt()));
  const dag = layout(load("grafo"));
  const original = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  layout.decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt().debug(true)))(dag);
  const debug = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(original.every((v, i) => close(v, debug[i])));
  test.end();
});
