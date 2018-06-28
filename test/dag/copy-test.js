const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = JSON.parse(fs.readFileSync("test/data/square.json"))

tape("dagCopy() works on square", test => {
  const dag = d3_dag.dagStratify()(square);
  const copy = d3_dag.dagCopy(dag);
  test.ok(d3_dag.dagEqual(dag, copy));
  test.ok(dag.every((n, i) => n !== copy[i]));
  test.ok(dag.every((n, i) => n.children !== copy[i].children));
  test.ok(dag.every((n, i) => n.parents !== copy[i].parents));
  test.end();
});
