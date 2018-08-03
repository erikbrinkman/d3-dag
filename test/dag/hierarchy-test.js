const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const d = {id: "d"};
const square = {
  id: "a",
  children: [
    {
      id: "b",
      children: [d],
    },
    {
      id: "c",
      children: [d],
    },
  ],
}
const squares = JSON.parse(fs.readFileSync("test/data/square.json"))
const squaresRoot = squares.filter(s => s.id === "3")[0];

tape("dierarchy() parses a simple square", test => {
  const dag = d3_dag.dierarchy()(square);
  const root = dag.nodes().filter(n => !n.parents.length)[0];
  test.equal(root.id, "a");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dierarchy() parses multiple roots", test => {
  const dag = d3_dag.dierarchy()(...square.children);
  const roots = dag.nodes().filter(n => !n.parents.length);
  test.equal(roots[0].children[0], roots[1].children[0]);
  test.end();
});

tape("dierarchy() parses the stratify square", test => {
  const dag = d3_dag.dierarchy()
    .children(d => d.parentIds.map(i => squares[parseInt(i)]))
    (squaresRoot);
  const root = dag.nodes().filter(n => !n.parents.length)[0];
  test.equal(root.id, "3");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dierarchy() parses a square with reversed ids", test => {
  const dag = d3_dag.dierarchy()
    .id(d => 3 - parseInt(d.id))
    .children(d => d.parentIds.map(i => squares[parseInt(i)]))
    (squaresRoot);
  const root = dag.nodes().filter(n => !n.parents.length)[0];
  test.equal(root.id, "0");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dierarchy() fails without unique ids", test => {
  const line = {
    id: "1",
    children: [{
      id: "2",
      children: [{
        id: "1",
      }],
    }],
  };
  test.throws(() => d3_dag.dierarchy()(line), /duplicate id/);
  test.end();
});

tape("dierarchy() fails with invalid root", test => {
  const one = {id: "1"},
    two = {id: "2"};
  one.children = [two];
  two.children = [one];
  test.throws(() => d3_dag.dierarchy()(one), /a root had a parent/);
  test.end();
});

tape("dierarchy() fails with disconnected", test => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
    },
  ];
  test.throws(() => d3_dag.dierarchy()(...data), /not connected/);
  test.end();
});

tape("dierarchy() fails with cycle", test => {
  const selfLoop = {id: "2"};
  selfLoop.children = [selfLoop];
  const line = {
    id: "1",
    children: [selfLoop],
  };
  test.throws(() => d3_dag.dierarchy()(line), /cycle: 2 -> 2$/);
  test.end();
});

tape("dierarchy() fails with hard cycle", test => {
  const loop = {
    id: "3",
    children: [{
      id: "4",
    }],
  },
    roota = {
      id: "1",
      children: loop.children.slice(),
    },
    rootb = {
      id: "2",
      children: [loop],
    };
  loop.children[0].children = [loop];
  test.throws(() => d3_dag.dierarchy()(roota, rootb), /cycle: 4 -> 3 -> 4$/);
  test.end();
});
