const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("decrossTwoLayer() default works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer())
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  const expected = [60, 14, 56, 84, 140, 140, 35, 70, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  test.ok(ordered.every((v, i) => close(v, expected[i])));
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
  const expected = [60, 14, 56, 84, 140, 140, 35, 70, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  test.ok(ordered.every((v, i) => close(v, expected[i])));
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
  const expected = [60, 14, 56, 84, 140, 140, 70, 35, 28, 140, 105, 80, 140, 120, 0, 28, 70, 42, 140, 20, 112, 70];
  test.ok(ordered.every((v, i) => close(v, expected[i])));
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
  const expected = [20, 140, 112, 98, 84, 35, 105, 70, 0, 80, 0, 120, 140, 140, 140, 126, 14, 84, 70, 100, 112, 70];
  test.ok(ordered.every((v, i) => close(v, expected[i])));
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
