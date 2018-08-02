const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../../");

const [square] = [
  "test/data/square.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("spread() works for square", test => {
  const layout = d3_dag.dagLayout().coords(d3_dag.dagCoordsSpread);
  layout(square);
  const [zero, one, two, three] = square.nodes().sort((a, b) => a.id - b.id);
  test.equals(zero.x, 0.5);
  test.equals(zero.y, 0);
  test.ok([0, 1].indexOf(one.x) >= 0);
  test.equals(one.y, 0.5);
  test.ok([0, 1].indexOf(two.x) >= 0);
  test.equals(two.y, 0.5);
  test.equals(three.x, 0.5);
  test.equals(three.y, 1);
  test.end();
});
