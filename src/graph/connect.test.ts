import { entries, map, slice } from "../iters";
import { graphConnect } from "./connect";

const zherebko = [
  ["1", "2"],
  ["1", "5"],
  ["1", "7"],
  ["2", "3"],
  ["2", "4"],
  ["2", "5"],
  ["2", "7"],
  ["2", "8"],
  ["3", "6"],
  ["3", "8"],
  ["4", "7"],
  ["5", "7"],
  ["5", "8"],
  ["5", "9"],
  ["6", "8"],
  ["7", "8"],
  ["9", "10"],
  ["9", "11"],
] as const;

test("graphConnect() parses a line", () => {
  const line = [["a", "b"]] as const;
  const build = graphConnect();
  const graph = build(line);
  expect(graph.nnodes()).toBe(2);
  expect(graph.multi()).toBe(false);
  expect(graph.acyclic()).toBe(true);
  expect(graph.connected()).toBe(true);
  const ids = [...map(graph, ({ data }) => data)].sort();
  expect(ids).toEqual(["a", "b"]);
});

test("graphConnect() parses a multi line", () => {
  const multiLine = [
    ["a", "b"],
    ["a", "b"],
  ] as const;
  const build = graphConnect();
  const graph = build(multiLine);
  expect(graph.nnodes()).toBe(2);
  expect(graph.multi()).toBe(true);
  expect(graph.acyclic()).toBe(true);
  expect(graph.connected()).toBe(true);
  const ids = [...map(graph, ({ data }) => data)].sort();
  expect(ids).toEqual(["a", "b"]);
});

test("graphConnect() parses a cycle", () => {
  const cycle = [
    ["a", "b"],
    ["b", "a"],
  ] as const;
  const build = graphConnect();
  const graph = build(cycle);
  expect(graph.nnodes()).toBe(2);
  expect(graph.multi()).toBe(false);
  expect(graph.acyclic()).toBe(false);
  expect(graph.connected()).toBe(true);
});

test("graphConnect() parses a single node", () => {
  const error = graphConnect();
  expect(() => error([["a", "a"]])).toThrow("self loop");

  const build = error.single(true);
  expect(build.single()).toBe(true);

  const graph = build([["a", "a"]]);
  expect(graph.nnodes()).toBe(1);
  const ids = [...map(graph, ({ data }) => data)];
  expect(ids).toEqual(["a"]);
});

test("graphConnect() parses disconnected", () => {
  const build = graphConnect().single(true);
  const graph = build([
    ["a", "a"],
    ["b", "b"],
  ]);
  expect(graph.nnodes()).toBe(2);
  expect(graph.multi()).toBe(false);
  expect(graph.acyclic()).toBe(true);
  expect(graph.connected()).toBe(false);
  const ids = [...map(graph, ({ data }) => data)];
  expect(ids).toEqual(["a", "b"]);
});

test("graphConnect() parses eye", () => {
  const build = graphConnect();
  const graph = build([
    ["0", "1"],
    ["0", "2"],
    ["0", "2"],
    ["1", "2"],
  ]);
  expect(graph.nnodes()).toBe(3);
  expect(graph.multi()).toBe(true);
  expect(graph.acyclic()).toBe(true);
  expect(graph.connected()).toBe(true);
  const [zero, one, two] = [...graph].sort(
    (a, b) => parseInt(a.data) - parseInt(b.data)
  );
  expect(zero.data).toBe("0");
  expect(zero.nchildren()).toBe(2);
  expect(zero.nparents()).toBe(0);
  expect(one.data).toBe("1");
  expect(one.nchildren()).toBe(1);
  expect(one.nparents()).toBe(1);
  expect(two.data).toBe("2");
  expect(two.nchildren()).toBe(0);
  expect(two.nparents()).toBe(2);
});

test("graphConnect() parses complex data", () => {
  const newSource = ({ source }: { source: string }): string => source;
  const newTarget = ({ target }: { target: string }): string => target;

  const complex = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "d" },
    { source: "c", target: "d" },
  ] as const;

  const build = graphConnect().sourceId(newSource).targetId(newTarget);
  expect(build.sourceId()).toBe(newSource);
  expect(build.targetId()).toBe(newTarget);

  const graph = build(complex);
  expect(graph.nnodes()).toBe(4);
});

test("graphConnect() parses zherebko", () => {
  const graph = graphConnect()(zherebko);
  expect(graph.nnodes()).toBeCloseTo(11);
});

test("graphConnect() allows custom node data", () => {
  const nodeDatum = (id: string) => ({ num: parseInt(id) - 1 });
  const build = graphConnect().nodeDatum(nodeDatum);
  expect(build.nodeDatum()).toBe(nodeDatum);
  const graph = build(zherebko);
  expect(graph.nnodes()).toBeCloseTo(11);
  const nums: number[] = [];
  for (const { data } of graph) {
    nums.push(data.num);
  }
  nums.sort((a, b) => a - b);
  const expected = [...new Array(11).keys()];
  expect(nums).toEqual(expected);
});

// this has two cycles that overlap with c -> a, so that's the edge that gets
// reversed
//    a
//   /^\
//  b | d
//   \|/
//    c
const cycle = [
  ["a", "b"],
  ["b", "c"],
  ["c", "a"],
  ["a", "d"],
  ["d", "c"],
] as const;

test("topological() reverses the correct edge", () => {
  const create = graphConnect();
  const grf = create(cycle);
  const [a, ...rest] = grf.topological();
  expect(a.data).toBe("a");
  const [c] = slice(rest, rest.length - 1, -1, -1);
  expect(c.data).toBe("c");
});

// NOTE this tests more edges cases in decycle
// The two upwards edges in this graph are reversed, but the relevant nodes
// have two different "delta"s checking that we also appropriately decrement
//      a
//      |
//   ---b
//  /  /^\
// i  c | d
//  \  \|/^\
//   ---e | f
//       \|/
//        g
//        |
//        h
const cyc = [
  ["a", "b"],
  ["b", "c"],
  ["b", "d"],
  ["c", "e"],
  ["d", "e"],
  ["e", "b"],
  ["d", "f"],
  ["f", "g"],
  ["e", "g"],
  ["g", "d"],
  ["b", "i"],
  ["i", "e"],
  ["g", "h"],
] as const;

test("topological() correctly handles complex case", () => {
  const create = graphConnect();
  const grf = create(cyc);
  const [a, b, ...rest] = grf.topological();
  expect(a.data).toBe("a");
  expect(b.data).toBe("b");
  const [h, g, ...rem] = slice(rest, rest.length - 1, -1, -1);
  expect(h.data).toBe("h");
  expect(g.data).toBe("g");

  const inds = new Map(
    map(entries(slice(rem, rem.length - 1, -1, -1)), ([i, { data }]) => [
      data,
      i,
    ])
  );
  expect(inds.get("d")! < inds.get("e")!).toBe(true);
});

test("graphConnect() fails passing an arg to connect", () => {
  expect(() => graphConnect(null as never)).toThrow(
    "got arguments to graphConnect"
  );
});

class BadZero {
  get [0](): string {
    throw new Error("bad zero");
  }
  readonly [1] = "b";
}

test("graphConnect() fails on non-string source", () => {
  expect(() => graphConnect()([[null as unknown as string, "a"]])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
  expect(() => graphConnect()([new BadZero()])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
});

class BadOne {
  readonly [0] = "a";
  get [1](): string {
    throw new Error("bad one");
  }
}

test("graphConnect() fails on non-string target", () => {
  expect(() => graphConnect()([["a", null as unknown as string]])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
  expect(() => graphConnect()([new BadOne()])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
});
