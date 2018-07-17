const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
  "test/data/en.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("sum() is correct for square", test => {
  const dag = square.sum(d => parseInt(d.id));
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [6, 4, 5, 3]);
  test.end()
});

tape("sum() is correct for N", test => {
  const dag = en.sum(d => parseInt(d.id))
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [2, 6, 2, 3]);
  test.end()
});

tape("sum() is correct for X", test => {
  const dag = ex.sum(d => parseInt(d.id))
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [19, 19, 20, 18, 4, 11, 6]);
  test.end()
});
