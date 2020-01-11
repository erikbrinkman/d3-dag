const tape = require("tape"),
  close = require("../close"),
  load = require("../load"),
  d3_dag = require("../../");

tape("sugiyama() works for grafo", (test) => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.sugiyama().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.ok(dag.links().every(({ data }) => data.points.length >= 2));
  test.end();
});

tape("sugiyama() works with separation", (test) => {
  const dag = load("grafo");
  const nodesBefore = dag.descendants().length;
  d3_dag.sugiyama().size([2, 2])(dag);
  test.equals(dag.descendants().length, nodesBefore);
  test.end();
});

tape("sugiyama() size works for standard", (test) => {
  const dag = load("ex");
  const layout = d3_dag.sugiyama().size([2, 2]);
  test.deepEqual(layout.size(), [2, 2]);
  test.equal(layout.nodeSize(), null);
  layout(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 0));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 0));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 2));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 2));
  test.end();
});

tape("sugiyama() size works for singleton", (test) => {
  const dag = d3_dag.dagHierarchy()({ id: "0" });
  d3_dag.sugiyama().size([2, 2])(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 1));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 1));
  test.end();
});

tape("sugiyama() node size works for standard", (test) => {
  const dag = load("ex");
  const layout = d3_dag.sugiyama().nodeSize([1, 1]);
  test.deepEqual(layout.nodeSize(), [1, 1]);
  test.equal(layout.size(), null);
  layout(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 0));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 0));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 4));
  test.end();
});

tape("sugiyama() node size works for singleton", (test) => {
  const dag = d3_dag.dagHierarchy()({ id: "0" });
  d3_dag.sugiyama().nodeSize([2, 2])(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 1));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 1));
  test.end();
});

tape("sugiyama() works for independent singleton nodes", (test) => {
  const dag = d3_dag.dagStratify()([{ id: "0" }, { id: "1" }]);
  d3_dag.sugiyama().size([2, 2])(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 0));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 2));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 1));

  d3_dag.sugiyama().nodeSize([2, 2])(dag);
  test.ok(close(Math.min(...dag.descendants().map((n) => n.x)), 0));
  test.ok(close(Math.min(...dag.descendants().map((n) => n.y)), 1));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.x)), 2));
  test.ok(close(Math.max(...dag.descendants().map((n) => n.y)), 1));

  test.end();
});
