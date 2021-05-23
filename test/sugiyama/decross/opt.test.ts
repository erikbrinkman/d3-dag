import { createLayers, crossings } from "../utils";

import { opt } from "../../../src/sugiyama/decross/opt";

test("opt() allows setting options", () => {
  const decross = opt().large("large").dist(true);
  expect(decross.large()).toEqual("large");
  expect(decross.dist()).toBeTruthy();
});

test("opt() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  opt()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1]
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
    [[1], [0, 2], [1]]
  ]).map((layer) => layer.reverse());
  expect(crossings(layers)).toBeCloseTo(2);
  const decross = opt().large("large");
  expect(decross.large()).toEqual("large");
  decross(layers);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("opt() does not optimize distance", () => {
  const layers = createLayers([[[0, 2]]]);
  opt()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [0, 1, 2]]);
});

test("opt() can optimize distance", () => {
  const layers = createLayers([[[0, 2]]]);
  opt().dist(true)(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [0, 2, 1]]);
});

test("opt() can optimize complex distance", () => {
  // family tree style
  //   ---o--
  //  /    \ \
  // o  o o o o
  //    |/ \ /
  //    o   o
  const layers = createLayers([[[0, 3, 4]], [[], [0], [0, 1], [], [1]]]);
  opt().dist(true)(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [1, 2, 4, 0, 3], [0, 1]]);
});

test("opt() fails for large inputs", () => {
  const layers = createLayers([
    [...Array(30).keys()].map((k) => [k]),
    [...Array(30).keys()].map((k) => [k]),
    [...Array(30).keys()].map((k) => [k])
  ]);
  expect(() => opt()(layers)).toThrow(`"large"`);
});

test("opt() fails for medium inputs", () => {
  const layers = createLayers([
    [...Array(20).keys()].map((k) => [k]),
    [...Array(20).keys()].map((k) => [k]),
    [...Array(20).keys()].map((k) => [k])
  ]);
  expect(() => opt()(layers)).toThrow(`"medium"`);
});

test("opt() fails passing an arg to constructor", () => {
  // @ts-expect-error opt takes no arguments
  expect(() => opt(undefined)).toThrow("got arguments to opt");
});
