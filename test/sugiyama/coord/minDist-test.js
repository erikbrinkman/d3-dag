const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("coordMinDist() works for square", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordMinDist)
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.nodes().sort((a, b) => a.id - b.id);
  test.ok(close(zero.x, 1));
  test.ok([0, 2].indexOf(one.x) >= 0);
  test.ok(close(two.x, 2 - one.x));
  test.ok(close(three.x, 1));
  test.end();
});

tape("coordMinDist() works for ex", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordMinDist)
    .size([2, 5]);
  const dag = layout(load("ex"));
  const [zero, one, two, three, four, five, six] = dag.nodes().sort((a, b) => a.id - b.id);
  test.ok(close(one.x, zero.x));
  test.ok(close(two.x, 2 - zero.x));
  test.ok(close(three.x, 1));
  test.ok(close(five.x, six.x));
  test.ok(close(four.x, 2 - five.x));
  test.end();
});
