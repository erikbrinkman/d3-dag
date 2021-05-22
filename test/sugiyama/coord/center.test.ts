import { createLayers, nodeSize } from "../utils";

import { coordCenter } from "../../../src";

test("coordCenter() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]]]);
  const [[head], [left, right], [tail]] = layers;
  coordCenter()(layers, nodeSize);

  expect(head.x).toBeCloseTo(1.0, 7);
  expect(left.x).toBeCloseTo(0.5, 7);
  expect(right.x).toBeCloseTo(1.5, 7);
  expect(tail.x).toBeCloseTo(1.0, 7);
});

test("coordCenter() fails passing an arg to constructor", () => {
  // @ts-expect-error center takes no arguments
  expect(() => coordCenter(undefined)).toThrow("got arguments to center");
});

test("coordCenter() throws for zero width", () => {
  const layers = createLayers([[[0]]]);
  expect(() => coordCenter()(layers, () => [0, 1] as const)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
