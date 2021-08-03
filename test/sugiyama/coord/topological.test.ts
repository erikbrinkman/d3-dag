import { topological } from "../../../src/sugiyama/coord/topological";
import { createLayers, nodeSize } from "../utils";

test("topological() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  topological()(layers, nodeSize);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(0.5, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("topological() works for disconnected", () => {
  const layered = createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
  const width = topological()(layered, nodeSize);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("topological() throws for non-topological", () => {
  const layers = createLayers([[[0], [0]], [[]]]);
  expect(() => topological()(layers, nodeSize)).toThrow(
    "only works with a topological layering"
  );
});

test("topological() fails passing an arg to constructor", () => {
  expect(() => topological(null as never)).toThrow(
    "got arguments to topological"
  );
});

test("topological() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => topological()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
