const tape = require("tape"),
  load = require("../../load"),
  toLayers = require("./toLayers"),
  d3_dag = require("../../../");

tape("layeringTopological() works for square", (test) => {
  const dag = d3_dag.layeringTopological()(load("square"));
  const layers = toLayers(dag);
  test.equals(layers.length, 4);
  test.deepEquals(layers, [[0], [2], [1], [3]]);
  test.end();
});
