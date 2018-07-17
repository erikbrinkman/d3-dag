const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const [square, en, ex] = [
  "test/data/square.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("descendants() works on square", test => {
  const [zero, one, two, three] = square.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(zero.descendants().map(n => n.id).sort(), square.nodes().map(n => n.id).sort());
  test.deepEquals(one.descendants().map(n => n.id).sort(), ["1", "3"]);
  test.deepEquals(two.descendants().map(n => n.id).sort(), ["2", "3"]);
  test.deepEquals(three.descendants().map(n => n.id).sort(), ["3"]);
  test.end();
});

tape("ancestors() works on square", test => {
  const [zero, one, two, three] = square.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(zero.ancestors().map(n => n.id).sort(), ["0"]);
  test.deepEquals(one.ancestors().map(n => n.id).sort(), ["0", "1"]);
  test.deepEquals(two.ancestors().map(n => n.id).sort(), ["0", "2"]);
  test.deepEquals(three.ancestors().map(n => n.id).sort(), square.nodes().map(n => n.id).sort());
  test.end();
});
