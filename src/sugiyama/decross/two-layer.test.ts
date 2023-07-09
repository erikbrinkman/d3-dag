import { Decross } from ".";
import { SugiNode } from "../sugify";
import { createLayers, getIndex } from "../test-utils";
import { twolayerAgg } from "../twolayer/agg";
import { twolayerOpt } from "../twolayer/opt";
import { decrossTwoLayer } from "./two-layer";

test("decrossTwoLayer() propagates to both layers", () => {
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
  decrossTwoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [1, 0],
    [0, 1],
    [0, 1],
  ]);
});

test("decrossTwoLayer() allows setting operators", () => {
  function order(
    above: SugiNode<{ order: number }>[],
    below: SugiNode<{ order: number }>[],
    topDown: boolean,
  ): void {
    const layer = topDown ? below : above;
    for (const _ of layer) {
      // noop
    }
  }
  function initOne(layers: SugiNode<{ init: boolean }>[][]) {
    for (const _ of layers) {
      // noop
    }
  }
  function initTwo(layers: SugiNode<unknown, null>[][]) {
    for (const _ of layers) {
      // noop
    }
  }

  const init = decrossTwoLayer() satisfies Decross<unknown, unknown>;
  const ordered = init.order(order);
  ordered satisfies Decross<{ order: number }, unknown>;
  // @ts-expect-error invalid data
  ordered satisfies Decross<unknown, unknown>;

  const layout = ordered.inits([initOne, initTwo]);
  layout satisfies Decross<{ order: number; init: boolean }, null>;
  // @ts-expect-error invalid data
  layout satisfies Decross<{ order: number }, unknown>;

  const [first, second] = layout.inits();
  expect(first satisfies typeof initOne).toBe(initOne);
  expect(second satisfies typeof initTwo).toBe(initTwo);
  expect(layout.order() satisfies typeof order).toBe(order);
});

test("decrossTwoLayer() propagates down and up", () => {
  const layers = createLayers([
    [[1], [1], [0], [1]],
    [[], []],
  ]);
  decrossTwoLayer()(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([
    [2, 3, 1, 0],
    [0, 1],
  ]);
});

test("decrossTwoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]],
    [[], []],
  ]);
  const twolayer = twolayerAgg();
  const myInit = () => undefined;
  const decross = decrossTwoLayer().order(twolayer).passes(2).inits([myInit]);
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

test("decrossTwoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[[0]], [[]]]);
  const decross = decrossTwoLayer();
  decross.order(twolayerAgg());
  decross.order(twolayerOpt());
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0]]);
});

test("decrossTwoLayer() can be set with no inits", () => {
  const layers = createLayers([[[0]], [[]]]);
  const decross = decrossTwoLayer().inits([]);
  expect(decross.inits()).toEqual([]);
  decross(layers);
  const inds = layers.map((layer) => layer.map(getIndex));
  expect(inds).toEqual([[0], [0]]);
});

test("decrossTwoLayer() fails passing 0 to passes", () => {
  expect(() => decrossTwoLayer().passes(0)).toThrow(
    "number of passes must be positive",
  );
});

test("decrossTwoLayer() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => decrossTwoLayer(null)).toThrow(
    "got arguments to decrossTwoLayer",
  );
});
