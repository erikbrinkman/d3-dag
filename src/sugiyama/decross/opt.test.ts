import { expect, test } from "bun:test";
import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import { decrossOpt } from "./opt";

// NOTE optimal decrossing minimization can always be flipped, so there's no
// way to guarantee a specific orientation

test("decrossOpt() allows setting options", () => {
  const decross = decrossOpt().check("oom").dist(true);
  expect(decross.check()).toEqual("oom");
  expect(decross.dist()).toBeTruthy();
});

test("decrossOpt() optimizes multiple links", () => {
  // minimizes multi-edges, although these shouldn't be possible in normal
  // operation, weighted edges might show up eventually
  // o  o    o   o
  // |XX|    ||x||
  // o  o -> o   o
  // |  |    |   |
  // o  o    o   o
  const layers = createLayers([
    [
      [0, 1, 1],
      [0, 0, 1],
    ],
    [[0], [1]],
    [[], []],
  ]);
  decrossOpt()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1],
  ]);
});

test("decrossOpt() keeps clique invariant", () => {
  // remains the same
  // o o
  // |X|
  // o o
  const layers = createLayers([
    [
      [0, 1],
      [0, 1],
    ],
    [[], []],
  ]);
  const decross = decrossOpt();
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [0, 1],
  ]);
});

test("decrossOpt() propagates to both layers", () => {
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
  const decross = decrossOpt();
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1],
  ]);
});

test("decrossOpt() is optimal", () => {
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
  const decross = decrossOpt().check("oom");
  expect(decross.check()).toEqual("oom");
  decross(layers);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("decrossOpt() works for compact layers", () => {
  // ideally this would force a crossing in the center in order to undo two
  // crossing on the outside. The extra nodes on the side are for coverage
  // o o
  //  x  #
  // o # #
  // | # |
  // o # #
  //  X  #
  // o o
  const layers = createLayers([
    [0n, 1n],
    [0n, 1n],
    [[1], [0], 2n],
    [0n, 1n, 2n],
    [[0], 1n, [2]],
    [0n, 1n, 2n],
    [[1], [0], 2n],
    [0n, 1n, []],
    [0n, 1n],
    [[], []],
  ]);
  const layout = decrossOpt();
  layout(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [0, 1],
    [0, 1, 2],
    [1, 0, 2],
    [1, 0, 2],
    [1, 0, 2],
    [1, 0, 2],
    [0, 1, 2],
    [0, 1],
    [0, 1],
  ]);
});

test("decrossOpt() does not optimize distance", () => {
  const layers = createLayers([[[0, 2]], [[], [], []]]);
  decrossOpt()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0, 1, 2]]);
});

test("decrossOpt() can optimize distance", () => {
  const layers = createLayers([[[0, 2]], [[], [], []]]);
  decrossOpt().dist(true)(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  // NOTE this is brittle in that 1 can be on either side
  expect(inds).toEqual([[0], [1, 0, 2]]);
});

test("decrossOpt() can optimize complex distance", () => {
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
  decrossOpt().dist(true)(layers);
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

test("decrossOpt() fails for large inputs", () => {
  const layers = createLayers([
    indexNestedArray(30),
    indexNestedArray(30),
    indexNestedArray(30),
    Array<number[]>(30).fill([]),
  ]);
  expect(() => decrossOpt()(layers)).toThrow(`"oom"`);
});

test("decrossOpt() fails for medium inputs", () => {
  const layers = createLayers([
    indexNestedArray(20),
    indexNestedArray(20),
    indexNestedArray(20),
    Array<number[]>(20).fill([]),
  ]);
  expect(() => decrossOpt()(layers)).toThrow(`"slow"`);
});

test("decrossOpt() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => decrossOpt(null)).toThrow("got arguments to decrossOpt");
});
