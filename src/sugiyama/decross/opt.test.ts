import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import { decrossOpt as opt } from "./opt";

test("opt() allows setting options", () => {
  const decross = opt().check("oom").dist(true);
  expect(decross.check()).toEqual("oom");
  expect(decross.dist()).toBeTruthy();
});

test("opt() propagates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]],
    [[], []],
  ]);
  opt()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1],
  ]);
});

test("opt() is optimal", () => {
  // greedy optimization keeps this structure because it minimizes the top
  // before the bottom resulting in two crossings, but taking one crossing at
  // the top allows removing both at the bottom
  // o o o
  // |/|\|
  // o o o
  //  X X
  // o o o
  const layers = createLayers([
    [[0], [0, 1, 2], [2]],
    [[1], [0, 2], [1]],
    [[], [], []],
  ]).map((layer) => layer.reverse());
  expect(crossings(layers)).toBeCloseTo(2);
  const decross = opt().check("oom");
  expect(decross.check()).toEqual("oom");
  decross(layers);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("opt() does not optimize distance", () => {
  const layers = createLayers([[[0, 2]], [[], [], []]]);
  opt()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0, 1, 2]]);
});

test("opt() can optimize distance", () => {
  const layers = createLayers([[[0, 2]], [[], [], []]]);
  opt().dist(true)(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0, 2, 1]]);
});

test("opt() can optimize complex distance", () => {
  // family tree style
  //   ---o--
  //  /    \ \
  // o  o o o o
  //    |/ \ /
  //    o   o
  const layers = createLayers([
    [[0, 3, 4]],
    [[], [0], [0, 1], [], [1]],
    [[], []],
  ]);
  opt().dist(true)(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [1, 2, 4, 0, 3], [0, 1]]);
});

function indexNestedArray(len: number): number[][] {
  return [
    ...Array<null>(len)
      .fill(null)
      .map((_, i) => [i]),
  ];
}

test("opt() fails for large inputs", () => {
  const layers = createLayers([
    indexNestedArray(30),
    indexNestedArray(30),
    indexNestedArray(30),
    Array<number[]>(30).fill([]),
  ]);
  expect(() => opt()(layers)).toThrow(`"oom"`);
});

test("opt() fails for medium inputs", () => {
  const layers = createLayers([
    indexNestedArray(20),
    indexNestedArray(20),
    indexNestedArray(20),
    Array<number[]>(20).fill([]),
  ]);
  expect(() => opt()(layers)).toThrow(`"slow"`);
});

test("opt() fails passing an arg to constructor", () => {
  expect(() => opt(null as never)).toThrow("got arguments to decrossOpt");
});
