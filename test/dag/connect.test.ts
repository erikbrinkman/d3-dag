import { connect } from "../../src/dag/create";
import { filter, map } from "../../src/iters";

const simpleSquare = [
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"]
] as const;
const simpleVee = [
  ["a", "c"],
  ["b", "c"]
] as const;
const complexSquare = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "b", target: "d" },
  { source: "c", target: "d" }
] as const;

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
  ["9", "11"]
] as const;

test("connect() parses a simple square", () => {
  const dag = connect()(simpleSquare);
  expect(dag.size()).toBeCloseTo(4);
  expect(dag.multidag()).toBe(false);
  const [root] = dag.iroots();
  expect(root.data.id).toBe("a");
  const [left, right] = root.ichildren();
  const [leftc] = left.ichildren();
  const [rightc] = right.ichildren();
  expect(leftc).toBe(rightc);
  expect([
    ["a", "b", "c", "d"],
    ["a", "c", "b", "d"]
  ]).toContainEqual([...map(dag.idescendants("before"), (n) => n.data.id)]);
});

test("connect() handles single nodes", () => {
  expect(() =>
    connect()([
      ["b", "a"],
      ["a", "a"]
    ])
  ).toThrow("self loop");

  const build = connect().single(true);
  expect(build.single()).toBeTruthy();

  const dag = build([["a", "a"]]);
  expect(dag.size()).toBeCloseTo(1);
  const ids = [...map(dag.idescendants("before"), (n) => n.data.id)];
  expect(ids).toEqual(["a"]);
});

test("connect() parses a more complex square", () => {
  const newSource = ({ source }: { source: string }): string => source;
  const newTarget = ({ target }: { target: string }): string => target;

  const layout = connect().sourceId(newSource).targetId(newTarget);
  expect(layout.sourceId()).toBe(newSource);
  expect(layout.targetId()).toBe(newTarget);

  const dag = layout(complexSquare);
  expect(dag.size()).toBeCloseTo(4);
});

test("connect() parses v", () => {
  const dag = connect()(simpleVee);
  expect(dag.size()).toBeCloseTo(3);
  expect(dag.roots()).toHaveLength(2);
});

test("connect() parses zherebko", () => {
  const dag = connect()(zherebko);
  expect(dag.size()).toBeCloseTo(11);
});

test("connect() allows custom node data", () => {
  const nodeDatum = (id: string) => ({ num: parseInt(id) });
  const layout = connect().nodeDatum(nodeDatum);
  expect(layout.nodeDatum()).toBe(nodeDatum);
  const dag = layout(zherebko);
  expect(dag.size()).toBeCloseTo(11);
  const nums: number[] = [];
  for (const { data } of dag) {
    nums.push(data.num);
  }
  nums.sort((a, b) => a - b);
  const expected = new Array(11).fill(undefined).map((_, i) => i + 1);
  expect(nums).toEqual(expected);
});

test("connect() decycle works with simple cycle", () => {
  // this has two cycles that overlap with c -> a, so that's the edge that gets
  // reversed
  const cycle = [
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
    ["a", "d"],
    ["d", "c"]
  ] as const;
  const layout = connect().decycle(true);
  expect(layout.decycle()).toBe(true);
  const dag = layout(cycle);
  const [a] = dag.iroots();
  expect(a.data.id).toBe("a");
  expect(a.nchildren()).toBe(3);
  const [clink] = filter(
    a.ichildLinks(),
    ({ target }) => target.data.id === "c"
  );
  expect(clink.reversed).toBe(true);
});

test("connect() decycle works with simple multidag", () => {
  // this has two cycles that overlap with c -> a, so that's the edge that gets
  // reversed
  const cycle = [
    ["a", "b"],
    ["a", "b"],
    ["b", "c"],
    ["c", "a"]
  ] as const;
  const layout = connect().decycle(true);
  expect(layout.decycle()).toBe(true);
  const dag = layout(cycle);
  const [a] = dag.iroots();
  expect(a.data.id).toBe("a");
  expect(a.nchildren()).toBe(2);
  expect(a.nchildLinks()).toBe(3);
  const [clink] = filter(
    a.ichildLinks(),
    ({ target }) => target.data.id === "c"
  );
  expect(clink.reversed).toBe(true);
});

test("connect() decycle works with only sources and sinks", () => {
  const cycle = [["a", "b"]] as const;
  const layout = connect().decycle(true);
  const dag = layout(cycle);
  const ids = [...map(dag, (n) => n.data.id)];
  expect(ids).toEqual(["a", "b"]);
});

test("connect() decycle works with complex cycle", () => {
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
  const cycle = [
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
    ["g", "h"]
  ] as const;
  const layout = connect().decycle(true);
  const dag = layout(cycle);
  const [a] = dag.idescendants("before");
  expect(a.data.id).toBe("a");
  const [h] = dag.idescendants("after");
  expect(h.data.id).toBe("h");
});

test("connect() works for multidag", () => {
  const cycle = [
    ["a", "b"],
    ["a", "b"]
  ] as const;
  const layout = connect();
  const dag = layout(cycle);
  expect(dag.multidag()).toBe(true);
  expect(dag.multidag()).toBe(true); // cache
  expect(dag.size()).toBe(2);
  const [a] = dag.iroots();
  expect(a.children()).toHaveLength(1);
  expect(a.childLinks()).toHaveLength(2);
});

test("connect() works for multidag dag", () => {
  const cycle = [
    ["a", "b"],
    ["a", "b"],
    ["c", "c"]
  ] as const;
  const layout = connect().single(true);
  const dag = layout(cycle);
  expect(dag.multidag()).toBe(true);
  expect(dag.multidag()).toBe(true); // cache
  expect(dag.size()).toBe(3);
});

test("connect() fails on empty", () => {
  expect(() => connect()([])).toThrow("can't connect empty data");
});

test("connect() fails passing an arg to connect", () => {
  expect(() => connect(null as never)).toThrow("got arguments to connect");
});

test("connect() fails with no roots", () => {
  const cycle = [
    ["a", "b"],
    ["b", "a"]
  ] as const;
  expect(() => connect()(cycle)).toThrow("dag contained no roots");
});

test("connect() fails with cycle", () => {
  const cycle = [
    ["c", "a"],
    ["a", "b"],
    ["b", "a"]
  ] as const;
  expect(() => connect()(cycle)).toThrow(
    `cycle: '{"id":"a"}' -> '{"id":"b"}' -> '{"id":"a"}'`
  );
});

class BadZero {
  get [0](): string {
    throw new Error("bad zero");
  }
  readonly [1] = "b";
}

test("connect() fails on non-string source", () => {
  expect(() => connect()([[null as unknown as string, "a"]])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
  expect(() => connect()([new BadZero()])).toThrow(
    "default source id expected datum[0] to be a string but got datum: "
  );
});

class BadOne {
  readonly [0] = "a";
  get [1](): string {
    throw new Error("bad one");
  }
}

test("connect() fails on non-string target", () => {
  expect(() => connect()([["a", null as unknown as string]])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
  expect(() => connect()([new BadOne()])).toThrow(
    "default target id expected datum[1] to be a string but got datum: "
  );
});
