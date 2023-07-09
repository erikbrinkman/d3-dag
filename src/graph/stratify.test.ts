import { MutGraph } from ".";
import { filter, map } from "../iters";
import { graphStratify } from "./stratify";

// initial types
interface Init {
  id: string;
  parentIds: string[];
}

interface Stratify<ND, L> {
  <N extends ND>(inp: N[]): MutGraph<N, L>;
}

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
  const single = [{ id: "0" }] as const;
  const build = graphStratify();
  const graph = build(single);
  const [node] = graph.nodes();
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
  const ids = [...map(graph.nodes(), ({ data }) => data.id)].sort();
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
  const ids = [...map(graph.nodes(), ({ data }) => data.id)].sort();
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

  const init = graphStratify() satisfies Stratify<Init, undefined>;
  // @ts-expect-error invalid data
  init satisfies Stratify<unknown, undefined>;

  const build = init.id(newId).parentIds(newParentIds);
  build satisfies Stratify<Datum, undefined>;

  expect(build.id() satisfies typeof newId).toBe(newId);
  expect(build.parentIds() satisfies typeof newParentIds).toBe(newParentIds);
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
  build satisfies Stratify<
    { i: string; pd?: readonly (readonly [string, string])[] | undefined },
    string
  >;
  // @ts-expect-error wrong data
  build satisfies Stratify<Init, undefined>;

  expect(build.id() satisfies typeof newId).toBe(newId);
  expect(build.parentData() satisfies typeof newParentData).toBe(newParentData);
  expect(build.parentIds().wrapped).toBe(newParentData);

  // check that wrapper works
  const justIds = build.parentIds();
  for (const data of complexSquare) {
    expect([...(justIds(data, 0) ?? [])].sort()).toEqual(
      (data.pd ?? []).map(([id]: readonly [string, string]) => id).sort(),
    );
  }

  const graph = build(complexSquare);
  const [root] = filter(graph.nodes(), ({ data }) => data.i === "a");
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
  // @ts-expect-error no args
  expect(() => graphStratify(null)).toThrow("got arguments to graphStratify");
});

test("graphStratify() fails at undefined id", () => {
  expect(() => {
    // @ts-expect-error null id
    graphStratify()([{ id: null }]);
  }).toThrow(
    "datum has an id field that was not a string, and no id accessor was specified",
  );
  expect(() => {
    // @ts-expect-error no id
    graphStratify()([{}]);
  }).toThrow(
    "datum did not have an id field, and no id accessor was specified",
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
  // @ts-expect-error invalid id type
  const id: () => string = () => null;
  const build = graphStratify().id(id);
  expect(() => build([{ parentIds: [] }])).toThrow(
    `id is supposed to be type string but got type "object"`,
  );
});

test("graphStratify() fails with incorrect parentIds", () => {
  const builder = graphStratify();
  // @ts-expect-error invalid datum
  expect(() => builder.id(() => "")([null])).toThrow(
    "default parentIds function expected datum to be an object but got: ",
  );
  // @ts-expect-error invalid datum
  expect(() => builder([{ id: "1", parentIds: null }])).toThrow(
    "default parentIds function expected parentIds to be an iterable of strings but got: ",
  );
});
