import { connect } from "../../src/dag/create";
import { map } from "../../src/iters";

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
  ).toThrow("cycle");

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

test("connect() parses vee", () => {
  const dag = connect()(simpleVee);
  expect(dag.size()).toBeCloseTo(3);
  expect(dag.roots()).toHaveLength(2);
});

test("connect() parses zherebko", () => {
  const dag = connect()(zherebko);
  expect(dag.size()).toBeCloseTo(11);
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

test("connect() fails on duplicate edges", () => {
  expect(() =>
    connect()([
      ["a", "b"],
      ["a", "b"]
    ])
  ).toThrow("contained duplicate children");
});
