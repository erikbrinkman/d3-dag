const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
  "test/data/en.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("height() is correct for square", test => {
  const dag = square.height();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.height),
    [2, 1, 1, 0]);
  test.end()
});

tape("height() is correct for N", test => {
  const dag = en.height();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.height),
    [1, 1, 0, 0]);
  test.end()
});

tape("height() is correct for X", test => {
  const dag = ex.height();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.height),
    [4, 3, 3, 2, 0, 1, 0]);
  test.end()
});
