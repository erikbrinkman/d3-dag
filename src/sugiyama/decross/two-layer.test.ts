import { createLayers, getIndex } from "../test-utils";
import { twolayerAgg as agg } from "../twolayer/agg";
import { twolayerOpt as opt } from "../twolayer/opt";
import { decrossTwoLayer as twoLayer } from "./two-layer";

test("twoLayer() propagates to both layers", () => {
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
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1],
  ]);
});

test("twoLayer() propagates down and up", () => {
  const layers = createLayers([
    [[1], [1], [0], [1]],
    [[], []],
  ]);
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [2, 3, 1, 0],
    [0, 1],
  ]);
});

test("twoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]],
    [[], []],
  ]);
  const twolayer = agg();
  const myInit = () => undefined;
  const decross = twoLayer().order(twolayer).passes(2).inits([myInit]);
  const [init] = decross.inits();
  expect(init).toBe(myInit);
  expect(decross.order()).toBe(twolayer);
  expect(decross.passes()).toBe(2);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0],
  ]);
});

test("twoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[[0]], [[]]]);
  const decross = twoLayer();
  decross.order(agg());
  decross.order(opt());
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0]]);
});

test("twoLayer() can be set with no inits", () => {
  const layers = createLayers([[[0]], [[]]]);
  const decross = twoLayer().inits([]);
  expect(decross.inits()).toEqual([]);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0]]);
});

test("twoLayer() fails passing 0 to passes", () => {
  expect(() => twoLayer().passes(0)).toThrow(
    "number of passes must be positive"
  );
});

test("twoLayer() fails passing an arg to constructor", () => {
  expect(() => twoLayer(null as never)).toThrow(
    "got arguments to decrossTwoLayer"
  );
});
