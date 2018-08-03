const tape = require("tape"),
  load = require("../load");

tape("ancestors() works on square", test => {
  const dag = load("square");
  const [zero, one, two, three] = dag.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(zero.ancestors().map(n => n.id).sort(), ["0"]);
  test.deepEquals(one.ancestors().map(n => n.id).sort(), ["0", "1"]);
  test.deepEquals(two.ancestors().map(n => n.id).sort(), ["0", "2"]);
  test.deepEquals(three.ancestors().map(n => n.id).sort(), dag.nodes().map(n => n.id).sort());
  test.end();
});
