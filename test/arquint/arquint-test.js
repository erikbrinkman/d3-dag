const tape = require("tape"),
  load = require("../load"),
  d3_dag = require("../../");

tape("arquint() works for grafo", (test) => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.arquint().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.ok(dag.links().every(({ data }) => data.points.length >= 2));
  test.end();
});

tape("arquint() works with separation", (test) => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.arquint().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.end();
});
