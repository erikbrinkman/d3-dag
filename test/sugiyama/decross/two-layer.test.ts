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
    [[1], [0]],
    [[0], [1]]
  ]);
  decrossTwoLayer()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("decrossTwoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  const twolayer = twolayerMedian();
  const decross = decrossTwoLayer().order(twolayer);
  expect(decross.order()).toBe(twolayer);
  decross(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("decrossTwoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[[0]]]);
  const decross = decrossTwoLayer();
  decross.order(twolayerMean());
  decross.order(twolayerMedian());
  decross.order(twolayerOpt());
  decross(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [0]]);
});

test("decrossTwoLayer() fails passing an arg to constructor", () => {
  // @ts-expect-error two-layer takes no arguments
  expect(() => decrossTwoLayer(undefined)).toThrow("got arguments to twoLayer");
});
