const tape = require("tape"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("column2CoordRect() works for square with zero column width", (test) => {
  // simple left is used as column assignment, which uses
  // the node's index in its layer as column index
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnSimpleLeft())
    .column2Coord(d3_dag.column2CoordRect())
    .columnWidth(() => 0)
    .columnSeparation(() => 1)
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id);
  test.equals(zero.x0, 0);
  test.equals(zero.x0, zero.x1);
  test.ok([0, 2].indexOf(one.x0) >= 0);
  test.equals(one.x0, one.x1);
  test.equals(two.x0, 2 - one.x0);
  test.equals(two.x0, two.x1);
  test.equals(three.x0, 0);
  test.equals(three.x0, three.x1);
  test.end();
});

tape("column2CoordRect() works for square with zero separation", (test) => {
  // simple left is used as column assignment, which uses
  // the node's index in its layer as column index
  const layout = d3_dag
    .arquint()
    .columnAssignment(d3_dag.columnSimpleLeft())
    .column2Coord(d3_dag.column2CoordRect())
    .columnWidth(() => 1)
    .columnSeparation(() => 0)
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id);
  test.equals(zero.x0, 0);
  test.equals(zero.x0 + 1, zero.x1);
  test.ok([0, 1].indexOf(one.x0) >= 0);
  test.equals(one.x0 + 1, one.x1);
  test.ok([one.x1, 2 - one.x1].indexOf(two.x0) >= 0);
  test.equals(two.x0 + 1, two.x1);
  test.equals(three.x0, 0);
  test.equals(three.x0 + 1, three.x1);
  test.end();
});
