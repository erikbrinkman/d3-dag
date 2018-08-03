const tape = require("tape"),
  load = require("../load");

tape("descendants() works on square", test => {
  const dag = load("square");
  const [zero, one, two, three] = dag.nodes().sort((a, b) => a.id - b.id);
  test.deepEquals(zero.descendants().map(n => n.id).sort(), dag.nodes().map(n => n.id).sort());
  test.deepEquals(one.descendants().map(n => n.id).sort(), ["1", "3"]);
  test.deepEquals(two.descendants().map(n => n.id).sort(), ["2", "3"]);
  test.deepEquals(three.descendants().map(n => n.id).sort(), ["3"]);
  test.end();
});

