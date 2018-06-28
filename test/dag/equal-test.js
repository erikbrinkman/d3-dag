const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = JSON.parse(fs.readFileSync("test/data/square.json"))

tape("dagEqual() works on square", test => {
  const dag = d3_dag.dagStratify()(square);
  test.ok(d3_dag.dagEqual(dag, dag));
  test.end();
});

tape("dagEqual() fails on slice", test => {
  const dag = d3_dag.dagStratify()(square);
  test.notOk(d3_dag.dagEqual(dag, dag.slice(1)));
  test.end();
});

tape("dagEqual() fails on same sized line", test => {
  const dag = d3_dag.dagStratify()(square);
  const other = d3_dag.dagStratify()(dag.map((_, i) => ({ id: i.toString(), parentIds: i ? [ (i - 1).toString() ] : [] })));
  test.notOk(d3_dag.dagEqual(dag, other));
  test.end();
});
