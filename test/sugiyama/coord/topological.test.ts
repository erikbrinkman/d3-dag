import { createLayers, sep } from "../utils";

import { coordTopological } from "../../../src";

test("coordTopological() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0]]);
  const [[one], [two, dummy], [three]] = layers;
  coordTopological()(layers, sep);

  expect(one.x).toBeCloseTo(0.0, 7);
  expect(two.x).toBeCloseTo(0.0, 7);
  expect(three.x).toBeCloseTo(0.0, 7);
  expect(dummy.x).toBeCloseTo(1.0, 7);
});

test("coordTopological() works for disconnected", () => {
  const layered = createLayers([[[0, 1]], [[], 0], [[]], [[0]]]);
  coordTopological()(layered, sep);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(1);
    }
  }
});

test("coordTopological() throws for non-topological", () => {
  const layers = createLayers([[[0], [1]]]);
  expect(() => coordTopological()(layers, sep)).toThrow(
    "only works with a topological layering"
  );
});

test("coordTopological() fails passing an arg to constructor", () => {
  const willFail = (coordTopological as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to topological");
});
