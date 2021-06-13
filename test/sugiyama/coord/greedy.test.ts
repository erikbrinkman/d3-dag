import { createLayers, nodeSize } from "../utils";

import { greedy } from "../../../src/sugiyama/coord/greedy";

test("greedy() works for N", () => {
  // degree matters
  const layers = createLayers([
    [[0, 1], [1]],
    [[], []]
  ]);
  const [[topLeft, topRight], [bottomLeft, bottomRight]] = layers;
  greedy()(layers, nodeSize);

  expect(topLeft.x).toBeCloseTo(1.0, 7);
  expect(topRight.x).toBeCloseTo(2.0, 7);
  expect(bottomLeft.x).toBeCloseTo(0.5, 7);
  expect(bottomRight.x).toBeCloseTo(1.5, 7);
});

test("greedy() works for carat", () => {
  // index fallback if not degree
  const layers = createLayers([[[0, 1]], [[], []]]);
  const [[head], [left, right]] = layers;
  greedy()(layers, nodeSize);

  expect(head.x).toBeCloseTo(0.5, 7);
  expect(left.x).toBeCloseTo(0.5, 7);
  expect(right.x).toBeCloseTo(1.5, 7);
});

test("greedy() works for triangle", () => {
  // dummy gets lowest priority
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  greedy()(layers, nodeSize);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(1, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("greedy() fails passing an arg to constructor", () => {
  expect(() => greedy(null as never)).toThrow("got arguments to greedy");
});

test("greedy() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => greedy()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
