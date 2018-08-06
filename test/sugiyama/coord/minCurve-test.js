const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("coordMinCurve() works for square", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordMinCurve)
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.nodes().sort((a, b) => a.id - b.id).map(n => n.x);
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
    .size([4, 5]);
  const dag = layout(load("ex"));
  const [zero, one, two, three, four, five, six] = dag.nodes().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(close(zero, 4));
  test.ok(close(one, 3));
  test.ok(close(two, 0));
  test.ok(close(three, 2));
  test.ok(close(four, 4));
  test.ok(close(five, 1));
  test.ok(close(six, 0));
  test.end();
});
