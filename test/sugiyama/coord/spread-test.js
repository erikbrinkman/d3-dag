const tape = require("tape"),
  load = require("../../load"),
  d3_dag = require("../../../");

tape("coordSpread() works for square", test => {
  const layout = d3_dag.sugiyama()
    .layering(d3_dag.layeringSimplex)
    .decross(d3_dag.decrossOpt)
    .coord(d3_dag.coordSpread)
    .width(2);
  const dag = layout(load("square"));
  const [zero, one, two, three] = dag.nodes().sort((a, b) => a.id - b.id);
  test.equals(zero.x, 1);
  test.ok([0, 2].indexOf(one.x) >= 0);
  test.equals(two.x, 2 - one.x);
  test.equals(three.x, 1);
  test.end();
});
