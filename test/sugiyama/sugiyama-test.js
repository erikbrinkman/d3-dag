const tape = require("tape"),
  load = require("../load"),
  fs = require("fs"),
  d3_dag = require("../../");

tape("sugiyama() works for grafo", test => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.sugiyama().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.end();
});
