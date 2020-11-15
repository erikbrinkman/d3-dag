import { createLayers, nodeSize } from "../utils";

import { coordTopological } from "../../../src";

test("coordTopological() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0]]);
  const [[one], [two, dummy], [three]] = layers;
  coordTopological()(layers, nodeSize);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(0.5, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("coordTopological() works for disconnected", () => {
  const layered = createLayers([[[0, 1]], [[], 0], [[]], [[0]]]);
  const width = coordTopological()(layered, nodeSize);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("coordTopological() throws for non-topological", () => {
  const layers = createLayers([[[0], [1]]]);
  expect(() => coordTopological()(layers, nodeSize)).toThrow(
    "only works with a topological layering"
  );
});

test("coordTopological() fails passing an arg to constructor", () => {
  const willFail = (coordTopological as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to topological");
});

test("coordTopological() throws for zero width", () => {
  const layers = createLayers([[[0]]]);
  expect(() => coordTopological()(layers, () => [0, 1])).toThrow(
    "must assign nonzero width to at least one node"
  );
});
