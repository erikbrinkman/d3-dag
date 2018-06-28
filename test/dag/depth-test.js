const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
  "test/data/en.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("depth() is correct for square", test => {
  const dag = d3_dag.dagDepth(square);
  test.deepEquals(dag.map(n => n.depth), [0, 1, 1, 2]);
  test.end()
});

tape("depth() is correct for N", test => {
  const dag = d3_dag.dagDepth(en);
  test.deepEquals(dag.map(n => n.depth), [0, 0, 1, 1]);
  test.end()
});

tape("depth() is correct for X", test => {
  const dag = d3_dag.dagDepth(ex);
  test.deepEquals(dag.map(n => n.depth), [0, 1, 0, 2, 3, 3, 4]);
  test.end()
});
