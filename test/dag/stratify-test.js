const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const square = JSON.parse(fs.readFileSync("examples/square.json"))

tape("dagStratify() parses a square", test => {
  const dag = d3_dag.dagStratify()(square);
  const root = dag.descendants().filter(n => n.id === "0")[0];
  test.equal(root.id, "0");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

function inv(id) {
  return (square.length - parseInt(id) - 1).toString();
}

tape("dagStratify() parses a square with reversed ids", test => {
  const dag = d3_dag.dagStratify()
    .id(d => inv(d.id))
    .parentIds(d => d.parentIds.map(inv))
    (square);
  const root = dag.descendants().filter(n => n.id === "3")[0];
  test.equal(root.id, "3");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagStratify() fails without unique ids", test => {
  const data = [
    { id: "1" },
    { id: "1" },
  ];
  test.throws(() => d3_dag.dagStratify()(data), /duplicate id/);
  test.end();
});

tape("dagStratify() fails with missing id", test => {
  const data = [{ id: "1", parentIds: ["2"] }];
  test.throws(() => d3_dag.dagStratify()(data), /missing id/);
  test.end();
});

tape("dagStratify() fails without root", test => {
  const data = [
    {
      id: "1",
      parentIds: ["2"],
    },
    {
      id: "2",
      parentIds: ["1"],
    },
  ];
  test.throws(() => d3_dag.dagStratify()(data), /no roots/);
  test.end();
});

tape("dagStratify() fails with disconnected", test => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
    },
  ];
  test.throws(() => d3_dag.dagStratify()(data), /not connected/);
  test.end();
});

tape("dagStratify() fails with cycle", test => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
      parentIds: ["1", "2"],
    },
  ];
  test.throws(() => d3_dag.dagStratify()(data), /cycle: 2 -> 2$/);
  test.end();
});

tape("dagStratify() fails with hard cycle", test => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
    },
    {
      id: "3",
      parentIds: ["4", "2"],
    },
    {
      id: "4",
      parentIds: ["1", "3"],
    },
  ]
  test.throws(() => d3_dag.dagStratify()(data), /cycle: 4 -> 3 -> 4$/);
  test.end();
});
