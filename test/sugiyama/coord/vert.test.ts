import { createLayers, sep } from "../utils";

import { coordVert } from "../../../src";

test("coordVert() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]]]);
  const [[head], [left, right], [tail]] = layers;
  coordVert()(layers, sep);

  expect(head.x).toBeCloseTo(0.5);
  expect(left.x).toBeCloseTo(0.0);
  expect(right.x).toBeCloseTo(1.0);
  expect(tail.x).toBeCloseTo(0.5);
});

test("coordVert() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0]]);
  const [[one], [two, dummy], [three]] = layers;
  coordVert()(layers, sep);

  expect(one.x).toBeCloseTo(0.6);
  expect(two.x).toBeCloseTo(0.0);
  expect(three.x).toBeCloseTo(0.6);
  expect(dummy.x).toBeCloseTo(1.0);
});

test("coordVert() fails passing an arg to constructor", () => {
  const willFail = (coordVert as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to vert");
});
