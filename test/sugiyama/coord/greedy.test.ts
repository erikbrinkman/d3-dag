import { createLayers, nodeSize } from "../utils";

import { coordGreedy } from "../../../src";

test("coordGreedy() works for N", () => {
  // degree matters
  const layers = createLayers([[[0, 1], [1]]]);
  const [[topLeft, topRight], [bottomLeft, bottomRight]] = layers;
  coordGreedy()(layers, nodeSize);

  expect(topLeft.x).toBeCloseTo(1.0, 7);
  expect(topRight.x).toBeCloseTo(2.0, 7);
  expect(bottomLeft.x).toBeCloseTo(0.5, 7);
  expect(bottomRight.x).toBeCloseTo(1.5, 7);
});

test("coordGreedy() works for carat", () => {
  // index fallback if not degree
  const layers = createLayers([[[0, 1]]]);
  const [[head], [left, right]] = layers;
  coordGreedy()(layers, nodeSize);

  expect(head.x).toBeCloseTo(0.5, 7);
  expect(left.x).toBeCloseTo(0.5, 7);
  expect(right.x).toBeCloseTo(1.5, 7);
});

test("coordGreedy() works for triangle", () => {
  // dummy gets lowest priority
  const layers = createLayers([[[0, 1]], [[0], 0]]);
  const [[one], [two, dummy], [three]] = layers;
  coordGreedy()(layers, nodeSize);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(1, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("coordGreedy() fails passing an arg to constructor", () => {
  // @ts-expect-error greedy takes no arguments
  expect(() => coordGreedy(undefined)).toThrow("got arguments to greedy");
});

test("coordGreedy() throws for zero width", () => {
  const layers = createLayers([[[0]]]);
  expect(() => coordGreedy()(layers, () => [0, 1])).toThrow(
    "must assign nonzero width to at least one node"
  );
});
