const tape = require("tape"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("left complex() works for square", (test) => {
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnComplex().center(false));
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id);
  test.equals(zero.columnIndex, 0);
  test.ok([0, 1].indexOf(one.columnIndex) >= 0);
  test.equals(two.columnIndex, 1 - one.columnIndex);
  test.equals(three.columnIndex, 0);
  test.end();
});

tape("left complex() works for dag", (test) => {
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnComplex().center(false));
  const dag = layout(load("dag"));
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => a.id - b.id);
  test.equals(zero.columnIndex, 0);
  test.ok([0, 1, 2].indexOf(one.columnIndex) >= 0);
  test.ok([0, 1, 2].indexOf(two.columnIndex) >= 0);
  test.ok([0, 1, 2].indexOf(four.columnIndex) >= 0);
  test.ok(one.columnIndex != two.columnIndex);
  test.ok(two.columnIndex != four.columnIndex);
  test.ok([one.columnIndex, two.columnIndex].indexOf(three.columnIndex) >= 0);
  test.equals(five.columnIndex, four.columnIndex);
  test.end();
});

tape("center complex() works for square", (test) => {
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnComplex().center(true));
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id);
  test.ok([0, 1].indexOf(zero.columnIndex) >= 0);
  test.ok([0, 1].indexOf(one.columnIndex) >= 0);
  test.equals(two.columnIndex, 1 - one.columnIndex);
  test.ok([0, 1].indexOf(three.columnIndex) >= 0);
  test.end();
});

tape("center complex() works for dag", (test) => {
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnComplex().center(true));
  const dag = layout(load("dag"));
  const [zero, one, two, three, four, five] = dag
    .descendants()
    .sort((a, b) => a.id - b.id);
  test.equals(zero.columnIndex, 1);
  test.ok([0, 1, 2].indexOf(one.columnIndex) >= 0);
  test.ok([0, 1, 2].indexOf(two.columnIndex) >= 0);
  test.ok([0, 1, 2].indexOf(four.columnIndex) >= 0);
  test.ok(one.columnIndex != two.columnIndex);
  test.ok(two.columnIndex != four.columnIndex);
  test.ok([one.columnIndex, two.columnIndex].indexOf(three.columnIndex) >= 0);
  test.equals(five.columnIndex, four.columnIndex);
  test.end();
});
