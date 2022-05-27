import { map } from "../iters";
import { graphHierarchy } from "./hierarchy";

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
  const build = graphHierarchy().children(typedChildren);
  expect(build.children()).toBe(typedChildren);
  expect([...(build.childrenData()(single, 0) ?? [])]).toHaveLength(0);
  const graph = build(single);
  expect(graph.nnodes()).toBe(1);
  const ids = [...map(graph, ({ data }) => data.id)];
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

  const build = graphHierarchy().childrenData(newChildData);
  expect(build.children().wrapped).toBe(newChildData);
  expect(build.childrenData()).toBe(newChildData);
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
    graphHierarchy(null as never);
  }).toThrow("got arguments to graphHierarchy");
});

class BadChildren {
  get children(): undefined {
    throw new Error("bad children");
  }
}

test("graphHierarchy() fails with incorrect children", () => {
  const build = graphHierarchy();
  expect(() => build(new BadChildren())).toThrow(
    "datum did not have an array children field, and no custom children accessor was specified"
  );
});
