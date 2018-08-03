const tape = require("tape"),
  load = require("../load"),
  d3_dag = require("../../");


tape("copy() works on square", test => {
  const dag = load("square");
  const copy = dag.copy();
  test.ok(dag.equals(copy));
  test.ok(dag.nodes().every((n, i) => n !== copy.nodes()[i]));
  test.ok(dag.nodes().every((n, i) => n.children !== copy.nodes()[i].children));
  test.ok(dag.nodes().every((n, i) => n.parents !== copy.nodes()[i].parents));
  test.end();
});
