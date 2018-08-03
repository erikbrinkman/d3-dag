const tape = require("tape"),
  load = require("../../load"),
  toLayers = require("./toLayers"),
  fs = require("fs"),
  d3_dag = require("../../../");

tape("layeringLongestPath() works for square", test => {
  const dag = load("square");
  d3_dag.layeringLongestPath(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 3);
  test.deepEquals(layers, [[0], [1, 2], [3]]);
  test.end();
});

tape("layeringLongestPath() works for grafo", test => {
  const dag = load("grafo");
  d3_dag.layeringLongestPath(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 6);
  test.deepEquals(
    layers,
    [[21], [12], [2, 4, 8], [0, 9, 11, 13, 19], [1, 3, 15, 16, 17, 18, 20], [5, 6, 7, 10, 14]]);
  test.end();
});
