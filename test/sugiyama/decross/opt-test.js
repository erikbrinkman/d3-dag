const tape = require("tape"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("decrossOpt() works for grafo", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringLongestPath)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordSpread)
    .size([140, 5]);
  const dag = layout(load("grafo"));
  const ordered = dag.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(
    ordered.map(n => n.y),
    [3, 4, 2, 4, 2, 5, 5, 5, 2, 3, 5, 3, 1, 3, 5, 4, 4, 4, 4, 3, 4, 0]);
  // This is brittle as there are many orientations that remove all crossings
  test.deepEquals(
    ordered.map(n => n.x),
    [120, 112, 28, 14, 84, 70, 35, 0, 112, 80, 140, 20, 70, 40, 105, 70, 126, 42, 84, 60, 28, 70]);
  test.end();
});

