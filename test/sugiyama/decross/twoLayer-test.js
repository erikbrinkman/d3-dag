const tape = require("tape"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("decrossTwoLayer() default works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer())
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.end();
});

tape("decrossTwoLayer() median works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMedian()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.end();
});

tape("decrossTwoLayer() mean works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerMean()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.end();
});

tape("decrossTwoLayer() opt works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossTwoLayer().order(d3_dag.twolayerOpt()))
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.end();
});
