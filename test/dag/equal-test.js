const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = d3_dag.dagStratify()(JSON.parse(fs.readFileSync("test/data/square.json")));

tape("equals() works on square", test => {
  test.ok(square.equals(square));
  test.end();
});

tape("equals() fails on same sized line", test => {
  const line = d3_dag.dagStratify()(square.nodes().map((_, i) => ({ id: i.toString(), parentIds: i ? [ (i - 1).toString() ] : [] })));
  test.notOk(square.equals(line));
  test.end();
});
