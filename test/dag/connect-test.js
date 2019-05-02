const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const topo = JSON.parse(fs.readFileSync("examples/zherebko.json"));
const square1 = [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]];
const square2 = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "b", target: "d" },
  { source: "c", target: "d" }
];

tape("dagConnect() fails passing an arg to dagConnect", (test) => {
  test.throws(() => {
    d3_dag.dagConnect([]);
  }, /got arguments to dagConnect/);
  test.end();
});

tape("dagConnect() parses a simple square", (test) => {
  const root = d3_dag.dagConnect()(square1);
  test.equal(root.id, "a");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagConnect() parses a more complex square", (test) => {
  const root = d3_dag
    .dagConnect()
    .sourceAccessor((l) => l.source)
    .targetAccessor((l) => l.target)(square2);
  test.equal(root.id, "a");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagConnect() parses topo", (test) => {
  const root = d3_dag.dagConnect()(topo);
  test.equal(root.size(), 11);
  test.end();
});
