const tape = require("tape"),
  load = require("../../load"),
  toLayers = require("./toLayers"),
  fs = require("fs"),
  d3_dag = require("../../../");

tape("layeringCoffmanGraham() works for square", test => {
  const dag = load("square");
  d3_dag.layeringCoffmanGraham(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 3);
  test.deepEquals(layers, [[0], [1, 2], [3]]);
  test.end();
});

tape("layeringCoffmanGraham() works for grafo", test => {
  const dag = load("grafo");
  d3_dag.layeringCoffmanGraham(dag);
  const layers = toLayers(dag);
  test.equals(layers.length, 6);
  test.deepEquals(
    layers,
    [[1, 2, 15, 19, 21], [8, 11, 12, 17], [0, 3, 4, 14], [9, 13, 16], [6, 10, 18, 20], [5, 7]]);
  test.end();
});
