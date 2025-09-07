import { expect, test } from "bun:test";
import { map } from "../iters";
import type { MutGraph } from ".";
import { graphHierarchy } from "./hierarchy";

// initial types
interface Init {
  children?: Iterable<Init> | undefined;
}

type Hierarchy<N, L> = (...inp: N[]) => MutGraph<N, L>;

interface Datum {
  id: string;
  children?: Datum[] | undefined;
}

const tail: Datum = { id: "d" };
const square: Datum = {
  id: "a",
  children: [
    {
      id: "b",
      children: [tail],
    },
    {
      id: "c",
      children: [tail],
    },
  ],
};

function typedChildren(datum: Datum): Datum[] | undefined {
  return datum.children;
}

test("graphHierarchy() parses minimal graph", () => {
  const single = { id: "a" };

  const init = graphHierarchy() satisfies Hierarchy<Init, undefined>;
  // @ts-expect-error invalid types
  init satisfies Hierarchy<unknown, unknown>;

  const build = init.children(typedChildren);
  build satisfies Hierarchy<Datum, undefined>;
  // @ts-expect-error invalid types
  build satisfies Hierarchy<Init, undefined>;

  expect(build.children() satisfies typeof typedChildren).toBe(typedChildren);
  expect([...(build.childrenData()(single, 0) ?? [])]).toHaveLength(0);
  const graph = build(single);
  expect(graph.nnodes()).toBe(1);
  const ids = [...map(graph.nodes(), ({ data }) => data.id)];
  expect(ids).toEqual(["a"]);
});

test("graphHierarchy() parses a simple square", () => {
  const build = graphHierarchy().children(typedChildren);
  const graph = build(square);
  expect(graph.nnodes()).toBe(4);
});

test("graphHierarchy() parses simple v", () => {
  const build = graphHierarchy();
  const graph = build(...(square.children ?? []));
  expect(graph.nnodes()).toBe(3);
});

interface ComplexDatum {
  c?: [ComplexDatum, string][];
}

test("graphHierarchy() works with custom operators", () => {
  const t: ComplexDatum = {};
  const s: ComplexDatum = {
    c: [
      [
        {
          c: [[t, "b -> d"]],
        },
        "a -> b",
      ],
      [
        {
          c: [[t, "c -> d"]],
        },
        "a -> c",
      ],
    ],
  };

  function newChildData({
    c,
  }: ComplexDatum): Iterable<readonly [ComplexDatum, string]> | undefined {
    return c;
  }

  const init = graphHierarchy() satisfies Hierarchy<Init, undefined>;
  // @ts-expect-error invalid types
  init satisfies Hierarchy<unknown, unknown>;

  const build = init.childrenData(newChildData);
  build satisfies Hierarchy<ComplexDatum, string>;
  // @ts-expect-error invalid types
  build satisfies Hierarchy<Init, undefined>;

  expect(build.children().wrapped).toBe(newChildData);
  expect(build.childrenData() satisfies typeof newChildData).toBe(newChildData);
  expect([...(build.children()(s, 0) ?? [])]).toHaveLength(2);
  expect([...(build.children()(t, 4) ?? [])]).toHaveLength(0);

  const graph = build(s);
  expect(graph.nnodes()).toBe(4);

  const single = build(t);
  expect(single.nnodes()).toBe(1);
});

test("graphHierarchy() handles a cycle", () => {
  const three: Datum = { id: "3", children: [] };
  const two: Datum = { id: "2", children: [three] };
  const one = {
    id: "1",
    children: [two],
  };
  three.children!.push(one);
  const build = graphHierarchy();
  const graph = build(one, one);
  expect(graph.nnodes()).toBe(3);
});

test("graphHierarchy() works for multi-graph", () => {
  const two: Datum = { id: "2", children: [] };
  const one: Datum = { id: "1", children: [two, two] };
  const build = graphHierarchy();
  const graph = build(one);
  expect(graph.multi()).toBe(true);
  expect(graph.nnodes()).toBe(2);
  expect([...graph.links()]).toHaveLength(2);
});

test("graphHierarchy() fails with self loop", () => {
  const selfLoop: Datum = { id: "2", children: [] };
  selfLoop.children!.push(selfLoop);
  const line = {
    id: "1",
    children: [selfLoop],
  };
  const build = graphHierarchy();
  expect(() => build(line)).toThrow("self loop");
});

test("graphHierarchy() throws for nonempty input", () => {
  expect(() => {
    // @ts-expect-error no args
    graphHierarchy(null);
  }).toThrow("got arguments to graphHierarchy");
});

test("graphHierarchy() fails with incorrect children", () => {
  const build = graphHierarchy();
  // @ts-expect-error invalid arg
  expect(() => build(null)).toThrow(
    "datum did not have an iterable children field, and no custom children accessor was specified",
  );
  // @ts-expect-error invalid arg
  expect(() => build({ children: null })).toThrow(
    "datum did not have an iterable children field, and no custom children accessor was specified",
  );
});
