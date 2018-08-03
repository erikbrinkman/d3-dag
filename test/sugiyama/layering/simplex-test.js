const tape = require("tape"),
  load = require("../../load"),
  toLayers = require("./toLayers"),
  d3_dag = require("../../../");

tape("layeringSimplex() works for square", test => {
  const dag = load("square");
  d3_dag.layeringSimplex(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 3);
  test.deepEquals(layers, [[0], [1, 2], [3]]);
  test.end();
});

tape("layeringSimplex() works for grafo", test => {
  const dag = load("grafo");
  d3_dag.layeringSimplex(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 8);
  const cost = dag.links().reduce((s, l) => s + l.target.layer - l.source.layer, 0);
  test.equals(cost, 30);
  // XXX There are two possible configurations
  test.deepEquals(
    layers,
    [[1, 8], [0, 14], [16, 21], [10, 12], [2, 4, 19], [9, 11, 13, 15, 17], [3, 6, 18, 20], [5, 7]]);
  test.end();
});
