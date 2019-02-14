const tape = require("tape"),
  fs = require("fs"),
  d3_dag = require("../../");

const d = { id: "d" };
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
};
const squares = JSON.parse(fs.readFileSync("examples/square.json"));
const [squaresRoot] = squares.filter((s) => s.id === "3");

tape("dagHierarchy() parses a simple square", (test) => {
  const root = d3_dag.dagHierarchy()(square);
  test.equal(root.id, "a");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagHierarchy() parses multiple roots", (test) => {
  const root = d3_dag.dagHierarchy()(...square.children);
  const roots = root.children;
  test.equal(roots[0].children[0], roots[1].children[0]);
  test.end();
});

tape("dagHierarchy() parses the stratify square", (test) => {
  const root = d3_dag
    .dagHierarchy()
    .children((d) => d.parentIds.map((i) => squares[parseInt(i)]))(squaresRoot);
  test.equal(root.id, "3");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagHierarchy() parses a square with reversed ids", (test) => {
  const root = d3_dag
    .dagHierarchy()
    .id((d) => 3 - parseInt(d.id))
    .children((d) => d.parentIds.map((i) => squares[parseInt(i)]))(squaresRoot);
  test.equal(root.id, "0");
  test.equal(root.children.length, 2);
  test.equal(root.children[0].children[0], root.children[1].children[0]);
  test.end();
});

tape("dagHierarchy() fails without unique ids", (test) => {
  const line = {
    id: "1",
    children: [
      {
        id: "2",
        children: [
          {
            id: "1",
          },
        ],
      },
    ],
  };
  test.throws(() => d3_dag.dagHierarchy()(line), /duplicate id/);
  test.end();
});

tape("dagHierarchy() fails with invalid root", (test) => {
  const one = { id: "1" },
    two = { id: "2" };
  one.children = [two];
  two.children = [one];
  test.throws(
    () => d3_dag.dagHierarchy()(one),
    /dag contained a cycle: 1 -> 2 -> 1/,
  );
  test.end();
});

tape("dagHierarchy() fails with disconnected", (test) => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
    },
  ];
  test.throws(() => d3_dag.dagHierarchy()(...data), /not connected/);
  test.end();
});

tape("dagHierarchy() fails with cycle", (test) => {
  const selfLoop = { id: "2" };
  selfLoop.children = [selfLoop];
  const line = {
    id: "1",
    children: [selfLoop],
  };
  test.throws(() => d3_dag.dagHierarchy()(line), /cycle: 2 -> 2$/);
  test.end();
});

tape("dagHierarchy() fails with hard cycle", (test) => {
  const loop = {
      id: "3",
      children: [
        {
          id: "4",
        },
      ],
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
  test.throws(() => d3_dag.dagHierarchy()(roota, rootb), /cycle: 4 -> 3 -> 4$/);
  test.end();
});

tape("dagHierarchy() fails with null id", (test) => {
  test.throws(
    () => d3_dag.dagHierarchy()({ id: "\0" }),
    /id contained null character/,
  );
  test.end();
});

tape("dagHierarchy() fails with null data", (test) => {
  test.throws(
    () =>
      d3_dag
        .dagHierarchy()
        .id(() => "0")
        .children(() => [])(null),
    /falsy data/,
  );
  test.end();
});

tape("dagHierarchy() fails with false data", (test) => {
  test.throws(
    () =>
      d3_dag
        .dagHierarchy()
        .id(() => "0")
        .children(() => [])(false),
    /falsy data/,
  );
  test.end();
});
