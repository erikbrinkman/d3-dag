const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = JSON.parse(fs.readFileSync("examples/square.json"));

tape("reverse() invariant is true for square", (test) => {
  const dag = d3_dag.dagStratify()(square);
  const copy = dag.copy().reverse();
  test.notOk(dag.equals(copy));
  test.ok(dag.equals(copy.reverse()));
  test.end();
});

tape("reverse() inverse parent/child loading", (test) => {
  const strat = d3_dag.dagStratify()(square);
  const rhier = d3_dag
    .dagHierarchy()
    .children((d) => d.parentIds.map((i) => square[parseInt(i)]))(
      ...square.filter((d) => d.id === "3"),
    )
    .reverse();
  test.ok(strat.equals(rhier));
  test.end();
});

tape("reverse() preserves link data", (test) => {
  const dag = d3_dag.dagHierarchy()({
    id: "0",
    children: [{ id: "1" }],
  });
  const [{ data }] = dag.links();
  data.test = true;
  const rev = dag.reverse();
  test.ok(rev.links()[0].data.test);
  test.end();
});
