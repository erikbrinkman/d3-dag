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
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id);
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
    .size([2, 4]);
  const dag = layout(load("ex"));
  const ordered = dag.descendants().sort((a, b) => a.id - b.id);
  const [zero, one, two, three, four, five, six] = ordered.map(n => n.x);
  test.ok(close(one, zero));
  test.ok(close(two, 2 - zero));
  test.ok(close(three, 1));
  test.ok(close(five, six));
  test.ok(close(four, 2 - five));
  test.end();
});
