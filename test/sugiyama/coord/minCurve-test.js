const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// Curve methods currently minimize distance too, so they're not quite a perfect curve minimization
const eps = 0.001;

tape("coordMinCurve() works for square", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringSimplex())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordMinCurve().weight(0.9999))
    .size([2, 2]);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  test.ok(close(zero, 1));
  test.ok([0, 2].indexOf(one) >= 0);
  test.ok(close(two, 2 - one));
  test.ok(close(three, 1));
  test.end();
});

tape("coordMinCurve() works for ex", (test) => {
  const layout = d3_dag
    .sugiyama()
    .layering(d3_dag.layeringSimplex())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordMinCurve().weight(0.9999))
    .size([4, 4]);
  const dag = layout(load("ex"));
  const ordered = dag
    .descendants()
    .sort((a, b) => a.id - b.id)
    .map((n) => n.x);
  const expected = [4, 3, 0, 2, 4, 1, 0];
  test.ok(ordered.every((v, i) => close(v, expected[i], eps)));
  test.end();
});
