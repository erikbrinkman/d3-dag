import { createLayers, nodeSep } from "../test-utils";
import { coordCenter as center } from "./center";

test("center() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  center()(layers, nodeSep);

  expect(head.x).toBeCloseTo(1.0, 7);
  expect(left.x).toBeCloseTo(0.5, 7);
  expect(right.x).toBeCloseTo(1.5, 7);
  expect(tail.x).toBeCloseTo(1.0, 7);
});

test("center() fails passing an arg to constructor", () => {
  expect(() => center(null as never)).toThrow("got arguments to coordCenter");
});

test("center() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => center()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node",
  );
});
