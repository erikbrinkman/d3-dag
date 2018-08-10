const tape = require("tape"),
  load = require("../../load"),
  toLayers = require("./toLayers"),
  fs = require("fs"),
  d3_dag = require("../../../");

tape("layeringCoffmanGraham() works for square", test => {
  const dag = d3_dag.layeringCoffmanGraham(load("square"));
  const layers = toLayers(dag);
  test.equals(layers.length, 3);
  test.deepEquals(layers, [[0], [1, 2], [3]]);
  test.end();
});

tape("layeringCoffmanGraham() works for grafo", test => {
  const dag = d3_dag.layeringCoffmanGraham(load("grafo"));
  const layers = toLayers(dag);
  test.equals(layers.length, 6);
  test.deepEquals(
    layers,
    [[2, 8, 15, 19, 21], [0, 1, 11, 12, 17], [3, 4, 14, 16], [9, 10, 13], [6, 18, 20], [5, 7]]);
  test.end();
});
