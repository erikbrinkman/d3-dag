import { createLayers, sep } from "../utils";

import { coordCenter } from "../../../src";

test("coordCenter() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]]]);
  const [[head], [left, right], [tail]] = layers;
  coordCenter()(layers, sep);

  expect(head.x).toBeCloseTo(0.5, 7);
  expect(left.x).toBeCloseTo(0.0, 7);
  expect(right.x).toBeCloseTo(1.0, 7);
  expect(tail.x).toBeCloseTo(0.5, 7);
});

test("coordCenter() fails passing an arg to constructor", () => {
  const willFail = (coordCenter as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to center");
});
