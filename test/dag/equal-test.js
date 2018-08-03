const tape = require("tape"),
  load = require("../load"),
  d3_dag = require("../../");

const square = load("square");

tape("equals() works on square", test => {
  test.ok(square.equals(square));
  test.end();
});

tape("equals() fails on same sized line", test => {
  const line = d3_dag.dratify()(square.nodes().map((_, i) => ({ id: i.toString(), parentIds: i ? [ (i - 1).toString() ] : [] })));
  test.notOk(square.equals(line));
  test.end();
});
