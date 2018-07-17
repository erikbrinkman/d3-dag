const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
  "test/data/en.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("count() is correct for square", test => {
  const dag = square.count();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [1, 1, 1, 1]);
  test.end()
});

tape("count() is correct for N", test => {
  const dag = en.count();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [1, 2, 1, 1]);
  test.end()
});

tape("count() is correct for X", test => {
  const dag = ex.count();
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [2, 2, 2, 2, 1, 1, 1]);
  test.end()
});
