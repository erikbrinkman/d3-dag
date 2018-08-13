const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// Curve methods currently minimize distance too, so they're not quite a perfect curve minimization
const eps = 0.001;

tape("coordMinBend() works for triangle", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordMinBend().weight(0.9999))
    .size([1, 2]);
  const dag = layout(load("triangle"));
  const [zero, one, two] = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(close(zero, 1, eps));
  test.ok(close(one, 0, eps));
  test.ok(close(two, 1, eps));
  test.end();
});
