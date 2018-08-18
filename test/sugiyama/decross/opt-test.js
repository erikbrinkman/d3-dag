const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("decrossOpt() works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordSpread())
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  test.deepEquals(
    ordered.map(n => n.y),
    [3, 4, 2, 4, 2, 5, 5, 5, 2, 3, 5, 3, 1, 3, 5, 4, 4, 4, 4, 3, 4, 0]);
  // This is brittle as there are many orientations that remove all crossings
  test.deepEquals(
    ordered.map(n => n.x),
    [120, 98, 28, 14, 84, 70, 35, 0, 112, 80, 140, 20, 70, 40, 105, 70, 126, 42, 84, 60, 28, 70]);
  test.end();
});

tape("decrossOpt() debug works for well behaved node names", test => {
  const layout = d3_dag.sugiyama()
    .decross(d3_dag.decrossOpt());
  const dag = layout(load("grafo"));
  const normal = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  layout.decross(d3_dag.decrossOpt().debug(true))(dag);
  const debug = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(normal.every((v, i) => close(v, debug[i])));
  test.end();
});

