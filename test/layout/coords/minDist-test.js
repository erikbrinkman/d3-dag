const tape = require("tape"),
  close = require("../../close");
  fs = require("fs"),
  d3_dag = require("../../../");

const [square, ex] = [
  "test/data/square.json",
  "test/data/ex.json",
].map(file => d3_dag.dagStratify()(JSON.parse(fs.readFileSync(file))));

tape("minDist() works for square", test => {
  const layout = d3_dag.dagLayout()
    .coords(d3_dag.dagCoordsSpread)
    .width(2);
  layout(square);
  const [zero, one, two, three] = square.nodes().sort((a, b) => a.id - b.id);
  test.equals(zero.x, 1);
  test.ok([0, 2].indexOf(one.x) >= 0);
  test.ok([0, 2].indexOf(two.x) >= 0);
  test.equals(three.x, 1);
  test.end();
});

tape("minDist() works for ex", test => {
  const layout = d3_dag.dagLayout()
    .layering(d3_dag.dagLayerSimplex)
    .coords(d3_dag.dagCoordsMinDist)
    .width(2);
  layout(ex);
  const [zero, one, two, three, four, five, six] = ex.nodes().sort((a, b) => a.id - b.id);
  test.ok(close(one.x, zero.x));
  test.ok(close(two.x, 2 - zero.x));
  test.ok(close(three.x, 1));
  test.ok(close(five.x, six.x));
  test.ok(close(four.x, 2 - five.x));
  test.end();
});
