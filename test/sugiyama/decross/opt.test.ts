import { createLayers, crossings } from "../utils";

import { decrossOpt } from "../../../src";

test("decrossOpt() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [1, 0],
    [0, 1]
  ]);
  decrossOpt()(layers);
  const ids = layers.map((layer) => layer.map((node) => node.id));
  // reversing all layers is always valid
  expect([
    [
      ["0,0", "0,1"],
      ["1,1", "1,0"],
      ["2,1", "2,0"]
    ],
    [
      ["0,1", "0,0"],
      ["1,0", "1,1"],
      ["2,0", "2,1"]
    ]
  ]).toContainEqual(ids);
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
    [0, [0, 1, 2], 2],
    [1, [0, 2], 1]
  ]).map((layer) => layer.reverse());
  expect(crossings(layers)).toBeCloseTo(2);
  const decross = decrossOpt().debug(true);
  expect(decross.debug()).toBeTruthy();
  decross(layers);
  expect(crossings(layers)).toBeCloseTo(1);
});

test("decrossOpt() fails passing an arg to constructor", () => {
  const willFail = (decrossOpt as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to opt");
});
