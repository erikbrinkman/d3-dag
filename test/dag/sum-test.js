const tape = require("tape"),
  load = require("../load");

tape("sum() is correct for square", test => {
  const dag = load("square").sum(d => parseInt(d.id));
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [6, 4, 5, 3]);
  test.end()
});

tape("sum() is correct for N", test => {
  const dag = load("en").sum(d => parseInt(d.id))
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [2, 6, 2, 3]);
  test.end()
});

tape("sum() is correct for X", test => {
  const dag = load("ex").sum(d => parseInt(d.id))
  test.deepEquals(
    dag.nodes().sort((a, b) => a.id - b.id).map(n => n.value),
    [19, 19, 20, 18, 4, 11, 6]);
  test.end()
});
