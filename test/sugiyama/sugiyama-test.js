const tape = require("tape"),
  load = require("../load"),
  fs = require("fs"),
  d3_dag = require("../../");

tape("sugiyama() works for grafo", test => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.sugiyama().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);

  d3_dag.layeringLongestPath(dag);
  const maxLayer = dag.descendants().reduce((l, n) => Math.max(l, n.layer), 0);
  test.equals(maxLayer, 5);
  const layers = new Array(6).fill(null).map(() => []);
  dag.each(n => layers[n.layer].push(parseInt(n.id)));
  test.deepEquals(
    layers.map(l => l.sort((a, b) => a - b)),
    [[21], [12], [2, 4, 8], [0, 9, 11, 13, 19], [1, 3, 15, 16, 17, 18, 20], [5, 6, 7, 10, 14]]);
  test.end();
});
