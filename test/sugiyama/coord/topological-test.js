const tape = require("tape"),
  close = require("../../close"),
  load = require("../../load"),
  d3_dag = require("../../../");

// Curve methods currently minimize distance too, so they're not quite a perfect curve minimization
const eps = 0.001;

tape("coordTopological() works for ex", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringTopological())
    .decross(d3_dag.decrossOpt())
    .coord(d3_dag.coordTopological())
    .size([1, 2]);
  const dag = layout(load("ex"));
  const exes = dag.descendants().sort((a, b) => a.id - b.id).map(n => n.x);
  test.ok(exes.every(x => close(x, 0.5, eps)));
  test.end();
});

tape("coordTopological() fails for none topological layout", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex())
    .coord(d3_dag.coordTopological());
  const dag = load("ex");
  test.throws(() => layout(dag), /only works with a topological ordering/);
  test.end();
});
