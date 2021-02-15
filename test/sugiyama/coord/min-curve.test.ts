import { createLayers, nodeSize } from "../utils";

import { coordMinCurve } from "../../../src";

test("coordMinCurve() works for square", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]]]);
  const [[head], [left, right], [tail]] = layers;

  const coord = coordMinCurve().weight(0.99999);
  expect(coord.weight()).toBeCloseTo(0.99999, 5);

  coord(layers, nodeSize);

  expect(head.x).toBeCloseTo(1, 3);
  expect(left.x).toBeCloseTo(1 / 2, 3);
  expect(right.x).toBeCloseTo(3 / 2, 3);
  expect(tail.x).toBeCloseTo(1, 3);
});

test("coordMinCurve() throws for invalid weights", () => {
  expect(() => coordMinCurve().weight(1)).toThrow("weight must be in [0, 1)");
  expect(() => coordMinCurve().weight(-1)).toThrow("weight must be in [0, 1)");
});

test("coordMinCurve() fails passing an arg to constructor", () => {
  // @ts-expect-error minCurve takes no arguments
  expect(() => coordMinCurve(undefined)).toThrow("got arguments to minCurve");
});
