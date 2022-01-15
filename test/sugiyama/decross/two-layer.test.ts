import { twoLayer } from "../../../src/sugiyama/decross/two-layer";
import { agg } from "../../../src/sugiyama/twolayer/agg";
import { opt } from "../../../src/sugiyama/twolayer/opt";
import { createLayers, getIndex } from "../utils";

test("twoLayer() propagates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]],
    [[], []]
  ]);
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("twoLayer() propagates down and up", () => {
  const layers = createLayers([
    [[1], [1], [0], [1]],
    [[], []]
  ]);
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1, 3, 2],
    [1, 0]
  ]);
});

test("twoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]],
    [[], []]
  ]);
  const twolayer = agg();
  const decross = twoLayer().order(twolayer).passes(2);
  expect(decross.order()).toBe(twolayer);
  expect(decross.passes()).toBe(2);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
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

test("twoLayer() fails passing an arg to constructor", () => {
  expect(() => twoLayer(null as never)).toThrow("got arguments to twoLayer");
});

test("twoLayer() fails passing 0 to passes", () => {
  expect(() => twoLayer().passes(0)).toThrow(
    "number of passes must be positive"
  );
});
