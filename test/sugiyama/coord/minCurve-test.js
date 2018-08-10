const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// Curve methods currently minimize distance too, so they're not quite a perfect curve minimization
const eps = 0.001;

tape("coordMinCurve() works for square", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordMinCurve)
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(close(zero, 1));
  test.ok([0, 2].indexOf(one) >= 0);
  test.ok(close(two, 2 - one));
  test.ok(close(three, 1));
  test.end();
});

tape("coordMinCurve() works for ex", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordMinCurve)
    .size([4, 4]);
  const dag = layout(load("ex"));
  // TODO This test is brittle if there's a different ordering of nodes
  const [zero, one, two, three, four, five, six] = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(close(zero, 4, eps));
  test.ok(close(one, 3, eps));
  test.ok(close(two, 0, eps));
  test.ok(close(three, 2, eps));
  test.ok(close(four, 4, eps));
  test.ok(close(five, 1, eps));
  test.ok(close(six, 0, eps));
  test.end();
});
