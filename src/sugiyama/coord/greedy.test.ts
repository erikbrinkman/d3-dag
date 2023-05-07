import { bigrams } from "../../iters";
import { createLayers, nodeSep } from "../test-utils";
import { coordGreedy } from "./greedy";

test("coordGreedy() works for N", () => {
  // degree matters
  const layers = createLayers([
    [[0, 1], [1]],
    [[], []],
  ]);
  const [[topLeft, topRight], [bottomLeft, bottomRight]] = layers;
  const coord = coordGreedy();
  coord(layers, nodeSep);

  expect(topLeft.x).toBeCloseTo(0.75);
  expect(topRight.x).toBeCloseTo(1.75);
  expect(bottomLeft.x).toBeCloseTo(0.5);
  expect(bottomRight.x).toBeCloseTo(1.5);
});

test("coordGreedy() works for carat", () => {
  // index fallback if not degree
  const layers = createLayers([[[0, 1]], [[], []]]);
  const [[head], [left, right]] = layers;
  const coord = coordGreedy();
  coord(layers, nodeSep);

  expect(head.x).toBeCloseTo(1);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
});

test("coordGreedy() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  const coord = coordGreedy();
  coord(layers, nodeSep);

  expect(one.x).toBeCloseTo(1);
  expect(two.x).toBeCloseTo(0.5);
  expect(dummy.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(1);
});

test("coordGreedy() straightens long edge", () => {
  const layers = createLayers([[[0, 1]], [[0], 1], [[0], 0], [[]]]);
  const [[one], [two, topDummy], [three, bottomDummy], [four]] = layers;
  const coord = coordGreedy();
  coord(layers, nodeSep);

  expect(one.x).toBeCloseTo(1);
  expect(two.x).toBeCloseTo(0.5);
  expect(topDummy.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(0.5);
  expect(bottomDummy.x).toBeCloseTo(1.5);
  expect(four.x).toBeCloseTo(1);
});

test("coordGreedy() works with simple compact dag", () => {
  const layers = createLayers([
    [[1], [0], 2n, [3]],
    [[], [], [], []],
  ]);
  const layout = coordGreedy();
  const width = layout(layers, nodeSep);

  expect(width).toBeCloseTo(4.75);
  for (const layer of layers) {
    for (const [left, right] of bigrams(layer)) {
      const gap = nodeSep(left, right) - 1e-3;
      expect(right.x - left.x).toBeGreaterThanOrEqual(gap);
    }
  }
});

test("coordGreedy() works with compact dag", () => {
  //    r
  //   / \
  //  /   #
  // l  c r
  //  \   #
  //   \ /
  //    t
  const layers = createLayers([
    [0n],
    [[0, 1]],
    [0, 2n],
    [0n, 1n, 2n],
    [[0], [], 1n],
    [0, [0]],
    [0n],
    [[]],
  ]);
  const layout = coordGreedy();
  const width = layout(layers, nodeSep);

  expect(width).toBeCloseTo(3.0625);
  for (const layer of layers) {
    for (const [left, right] of bigrams(layer)) {
      const gap = nodeSep(left, right) - 1e-3;
      expect(right.x - left.x).toBeGreaterThanOrEqual(gap);
    }
  }
});

test("coordGreedy() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => coordGreedy(null)).toThrow("got arguments to coordGreedy");
});

test("coordGreedy() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => coordGreedy()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
