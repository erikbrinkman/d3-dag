import { filter, map } from "../iters";
import { graphStratify } from "./stratify";

interface Datum {
  id: string;
  parentIds?: readonly string[] | undefined;
}

const square = [
  {
    id: "0",
  },
  {
    id: "1",
    parentIds: ["0"],
  },
  {
    id: "2",
    parentIds: ["0"],
  },
  {
    id: "3",
    parentIds: ["1", "2"],
  },
] as const;

function alter(id: string): string {
  return `a${id}`;
}

test("graphStratify() parses minimal graph", () => {
  const single = [
    {
      id: "0",
    },
  ] as const;
  const build = graphStratify();
  const graph = build(single);
  const [node] = graph;
  expect(node.data.id).toBe("0");
  expect([...node.children()]).toHaveLength(0);
});

test("graphStratify() parses multi-root graph", () => {
  const doub = [
    {
      id: "0",
    },
    {
      id: "1",
    },
  ] as const;
  const build = graphStratify();
  const graph = build(doub);
  expect(graph.nnodes()).toBe(2);
  const ids = [...map(graph, ({ data }) => data.id)].sort();
  expect(ids).toEqual(["0", "1"]);
});

test("graphStratify() parses ids with spaces", () => {
  const spaces = [
    {
      id: "0 0",
    },
    {
      id: "1 1",
      parentIds: ["0 0"],
    },
  ] as const;
  const build = graphStratify();
  const graph = build(spaces);
  const ids = [...map(graph, ({ data }) => data.id)].sort();
  expect(ids).toEqual(["0 0", "1 1"]);
});

test("graphStratify() parses a square", () => {
  const build = graphStratify();
  const graph = build(square);
  expect(graph.nnodes()).toBe(4);
});

test("graphStratify() parses a square with altered ids", () => {
  function newId(d: Datum): string {
    return alter(d.id);
  }
  function newParentIds(d: Datum): readonly string[] {
    return (d.parentIds ?? []).map(alter);
  }
  const build = graphStratify().id(newId).parentIds(newParentIds);
  expect(build.id()).toBe(newId);
  expect(build.parentIds()).toBe(newParentIds);
  expect(build.parentData().wrapped).toBe(newParentIds);
  const graph = build(square);
  expect(graph.nnodes()).toBe(4);
});

test("graphStratify() works with data accessor", () => {
  const complexSquare = [
    { i: "a", pd: undefined },
    { i: "b", pd: [["a", "a -> b"]] },
    { i: "c", pd: [["a", "a -> c"]] },
    {
      i: "d",
      pd: [
        ["b", "b -> d"],
        ["c", "c -> d"],
      ],
    },
  ] as const;

  const newId = ({ i }: { i: string }) => i;
  function newParentData({
    pd,
  }: {
    pd?: readonly (readonly [string, string])[] | undefined;
  }): Iterable<readonly [string, string]> | undefined {
    return pd;
  }

  const build = graphStratify().id(newId).parentData(newParentData);
  expect(build.id()).toBe(newId);
  expect(build.parentData()).toBe(newParentData);
  expect(build.parentIds().wrapped).toBe(newParentData);

  // check that wrapper works
  const justIds = build.parentIds();
  for (const data of complexSquare) {
    expect([...(justIds(data, 0) ?? [])].sort()).toEqual(
      (data.pd ?? []).map(([id]: readonly [string, string]) => id).sort()
    );
  }

  const graph = build(complexSquare);
  const [root] = filter(graph, ({ data }) => data.i === "a");
  expect(root.data.i).toBe("a");
  expect(root.nchildren()).toBe(2);
  const [left, right] = root.children();
  expect(left.children().next().value).toBe(right.children().next().value);
});

test("graphStratify() decycle works with cycle", () => {
  const data = [
    {
      id: "1",
      parentIds: ["3"],
    },
    {
      id: "2",
      parentIds: ["1"],
    },
    {
      id: "3",
      parentIds: ["2"],
    },
  ];
  const build = graphStratify();
  const graph = build(data);
  expect(graph.nnodes()).toBe(3);
});

test("graphStratify() works for multi-graph", () => {
  const data = [
    {
      id: "1",
      parentIds: [],
    },
    {
      id: "2",
      parentIds: ["1", "1"],
    },
  ];
  const build = graphStratify();
  const graph = build(data);
  expect(graph.multi()).toBe(true);
  expect(graph.nnodes()).toBe(2);
  expect([...graph.links()]).toHaveLength(2);
});

test("graphStratify() fails with arguments", () => {
  expect(() => graphStratify(undefined as never)).toThrow(
    "got arguments to graphStratify"
  );
});

class BadId {
  get id(): string {
    throw new Error("bad id");
  }
}
test("graphStratify() fails at undefined id", () => {
  expect(() => {
    graphStratify()([{ id: null as unknown as string }]);
  }).toThrow(
    "datum did not have an id field, and no id accessor was specified"
  );
  expect(() => {
    graphStratify()([new BadId()]);
  }).toThrow(
    "datum did not have an id field, and no id accessor was specified"
  );
});

test("graphStratify() fails without unique ids", () => {
  const data = [
    { id: "1", parentIds: [] },
    { id: "1", parentIds: [] },
  ];
  expect(() => graphStratify()(data)).toThrow("duplicate id");
});

test("graphStratify() fails with missing id", () => {
  const data = [{ id: "1", parentIds: ["2"] }];
  expect(() => graphStratify()(data)).toThrow("missing id");
});

test("graphStratify() fails with self loop", () => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
      parentIds: ["1", "2"],
    },
  ];
  const build = graphStratify();
  expect(() => build(data)).toThrow("self loop");
});

test("graphStratify() works with a cycle", () => {
  const data = [
    {
      id: "1",
    },
    {
      id: "2",
      parentIds: ["1", "3"],
    },
    {
      id: "3",
      parentIds: ["2"],
    },
  ];
  const build = graphStratify();
  const graph = build(data);
  expect(graph.nnodes()).toBe(3);
});

test("graphStratify() works with a hard cycle", () => {
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
  ];
  const build = graphStratify();
  const graph = build(data);
  expect(graph.nnodes()).toBe(4);
});

test("graphStratify() fails with invalid id type", () => {
  const id = () => null as never;
  const build = graphStratify().id(id);
  expect(() => build([{ parentIds: [] }])).toThrow(
    `id is supposed to be type string but got type "object"`
  );
});

class BadParentIds {
  id = "";
  get parentIds(): undefined {
    throw new Error("bad parent ids");
  }
}

test("graphStratify() fails with incorrect parentIds", () => {
  const data = [
    {
      id: "1",
      parentIds: null as unknown as undefined,
    },
  ];
  expect(() => graphStratify()(data)).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
  expect(() => graphStratify()([new BadParentIds()])).toThrow(
    "default parentIds function expected datum to have a parentIds field but got: "
  );
});
