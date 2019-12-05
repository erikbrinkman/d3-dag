const tape = require("tape"),
  d3_dag = require("../../");

tape("connected() is correct for point", (test) => {
  const dag = d3_dag.dagStratify()([{ id: "0" }]);
  test.ok(dag.connected());
  test.end();
});

tape("connected() is correct for two points", (test) => {
  const dag = d3_dag.dagStratify()([{ id: "0" }, { id: "1" }]);
  test.notOk(dag.connected());
  test.end();
});

tape("connected() is correct for v", (test) => {
  const dag = d3_dag.dagStratify()([
    { id: "0" },
    { id: "1" },
    { id: "2", parentIds: ["0", "1"] }
  ]);
  test.ok(dag.connected());
  test.end();
});

tape("connected() is correct for double v", (test) => {
  const dag = d3_dag.dagStratify()([
    { id: "0" },
    { id: "1" },
    { id: "2", parentIds: ["0", "1"] },
    { id: "3" },
    { id: "4" },
    { id: "5", parentIds: ["3", "4"] }
  ]);
  test.notOk(dag.connected());
  test.end();
});

tape("connected() is correct for w", (test) => {
  const dag = d3_dag.dagStratify()([
    { id: "0" },
    { id: "1" },
    { id: "2" },
    { id: "3", parentIds: ["0", "2"] },
    { id: "4", parentIds: ["1", "2"] }
  ]);
  test.ok(dag.connected());
  test.end();
});
