import { createLayers, crossings } from "../utils";

import { decrossOpt } from "../../../src";

test("decrossOpt() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  decrossOpt()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  // reversing all layers is always valid
  expect([
    [
      [0, 1],
      [1, 0],
      [1, 0]
    ],
    [
      [1, 0],
      [0, 1],
      [0, 1]
    ]
  ]).toContainEqual(inds);
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
    [[1], [0, 2], [1]]
  ]).map((layer) => layer.reverse());
  expect(crossings(layers)).toBeCloseTo(2);
  const decross = decrossOpt().large("large");
  expect(decross.large()).toEqual("large");
  decross(layers);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("decrossOpt() fails for large inputs", () => {
  const layers = createLayers([
    [...Array(30).keys()].map((k) => [k]),
    [...Array(30).keys()].map((k) => [k]),
    [...Array(30).keys()].map((k) => [k])
  ]);
  expect(() => decrossOpt()(layers)).toThrow(`"large"`);
});

test("decrossOpt() fails for medium inputs", () => {
  const layers = createLayers([
    [...Array(20).keys()].map((k) => [k]),
    [...Array(20).keys()].map((k) => [k]),
    [...Array(20).keys()].map((k) => [k])
  ]);
  expect(() => decrossOpt()(layers)).toThrow(`"medium"`);
});

test("decrossOpt() fails passing an arg to constructor", () => {
  // @ts-expect-error opt takes no arguments
  expect(() => decrossOpt(undefined)).toThrow("got arguments to opt");
});
