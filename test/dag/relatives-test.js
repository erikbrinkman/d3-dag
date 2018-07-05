const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("descendants() works on square", test => {
  test.deepEquals(square.nodes()[0].descendants().map(n => n.id).sort(), square.nodes().map(n => n.id).sort());
  test.deepEquals(square.nodes()[1].descendants().map(n => n.id).sort(), ["1", "3"]);
  test.deepEquals(square.nodes()[2].descendants().map(n => n.id).sort(), ["2", "3"]);
  test.deepEquals(square.nodes()[3].descendants().map(n => n.id).sort(), ["3"]);
  test.end();
});

tape("ancestors() works on square", test => {
  test.deepEquals(square.nodes()[0].ancestors().map(n => n.id).sort(), ["0"]);
  test.deepEquals(square.nodes()[1].ancestors().map(n => n.id).sort(), ["0", "1"]);
  test.deepEquals(square.nodes()[2].ancestors().map(n => n.id).sort(), ["0", "2"]);
  test.deepEquals(square.nodes()[3].ancestors().map(n => n.id).sort(), square.nodes().map(n => n.id).sort());
  test.end();
});
