const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
  "test/data/en.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("height() is correct for square", test => {
  const dag = d3_dag.dagHeight(square);
  test.deepEquals(dag.map(n => n.height), [2, 1, 1, 0]);
  test.end()
});

tape("height() is correct for N", test => {
  const dag = d3_dag.dagHeight(en);
  test.deepEquals(dag.map(n => n.height), [1, 1, 0, 0]);
  test.end()
});

tape("height() is correct for X", test => {
  const dag = d3_dag.dagHeight(ex);
  test.deepEquals(dag.map(n => n.height), [4, 3, 3, 2, 0, 1, 0]);
  test.end()
});
