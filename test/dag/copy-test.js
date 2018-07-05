const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = JSON.parse(fs.readFileSync("test/data/square.json"))

tape("copy() works on square", test => {
  const dag = d3_dag.dagStratify()(square);
  const copy = dag.copy();
  test.ok(dag.equals(copy));
  test.ok(dag.nodes().every((n, i) => n !== copy.nodes()[i]));
  test.ok(dag.nodes().every((n, i) => n.children !== copy.nodes()[i].children));
  test.ok(dag.nodes().every((n, i) => n.parents !== copy.nodes()[i].parents));
  test.end();
});
