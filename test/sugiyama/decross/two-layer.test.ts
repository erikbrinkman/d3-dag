import {
  decrossTwoLayer,
  twolayerMean,
  twolayerMedian,
  twolayerOpt
} from "../../../src";

import { createLayers } from "../utils";

test("decrossTwoLayer() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [1, 0],
    [0, 1]
  ]);
  decrossTwoLayer()(layers);
  const ids = layers.map((layer) => layer.map((node) => node.id));
  expect(ids).toEqual([
    ["0,0", "0,1"],
    ["1,1", "1,0"],
    ["2,1", "2,0"]
  ]);
});

test("decrossTwoLayer() can be set", () => {
  const layers = createLayers([
    [1, 0],
    [0, 1]
  ]);
  const twolayer = twolayerMedian();
  const decross = decrossTwoLayer().order(twolayer);
  expect(decross.order()).toBe(twolayer);
  decross(layers);
  const ids = layers.map((layer) => layer.map((node) => node.id));
  expect(ids).toEqual([
    ["0,0", "0,1"],
    ["1,1", "1,0"],
    ["2,1", "2,0"]
  ]);
});

test("decrossTwoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[0]]);
  const decross = decrossTwoLayer();
  decross.order(twolayerMean());
  decross.order(twolayerMedian());
  decross.order(twolayerOpt());
  decross(layers);
  const ids = layers.map((layer) => layer.map((node) => node.id));
  expect(ids).toEqual([["0,0"], ["1,0"]]);
});

test("decrossTwoLayer() fails passing an arg to constructor", () => {
  const willFail = (decrossTwoLayer as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to twoLayer");
});
