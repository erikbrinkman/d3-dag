const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const topo = JSON.parse(fs.readFileSync("test/data/topo.json"))
const square = [
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"]
];

tape("dagConnect() parses a simple square", test => {
  const root = d3_dag.dagConnect()(square);
  test.equal(root.id, "a");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagConnect() parses topo", test => {
  const root = d3_dag.dagConnect()(topo);
  test.equal(root.size(), 11);
  test.end();
});
