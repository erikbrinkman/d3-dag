import { createLayers, nodeSep } from "../test-utils";
import { coordTopological as topological } from "./topological";

test("topological() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  const coord = topological();
  expect(coord.straight()).toBe(true);
  coord(layers, nodeSep);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(0.5, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("topological() works for multiple edges", () => {
  const layers = createLayers([
    [[0, 1, 2, 3]],
    [0, [1, 2], 2, 3],
    [0, 0, [0], 0],
    [[]],
  ]);
  const [[one], [d1, two, d2, d3], [d4, d5, three, d6], [four]] = layers;
  const coord = topological();
  coord(layers, nodeSep);

  expect(one.x).toBeCloseTo(2.5, 7);
  expect(two.x).toBeCloseTo(2.5, 7);
  expect(three.x).toBeCloseTo(2.5, 7);
  expect(four.x).toBeCloseTo(2.5, 7);
  expect(d1.x).toBeCloseTo(0.5);
  expect(d2.x).toBeCloseTo(3.5);
  expect(d3.x).toBeCloseTo(4.5);
  expect(d4.x).toBeCloseTo(0.5);
  expect(d5.x).toBeCloseTo(1.5);
  expect(d6.x).toBeCloseTo(4.5);
});

test("topological() works for disconnected", () => {
  const layered = createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
  const coord = topological();
  const width = coord(layered, nodeSep);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("topological().straight(false) works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  const coord = topological().straight(false);
  expect(coord.straight()).toBe(false);
  coord(layers, nodeSep);

  expect(one.x).toBeCloseTo(0.5, 7);
  expect(two.x).toBeCloseTo(0.5, 7);
  expect(three.x).toBeCloseTo(0.5, 7);
  expect(dummy.x).toBeCloseTo(1.5, 7);
});

test("topological().straight(false) works for disconnected", () => {
  const layered = createLayers([[[0, 1]], [[], 0], [[]], [[0]], [[]]]);
  const coord = topological().straight(false);
  const width = coord(layered, nodeSep);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("topological() works for compact", () => {
  const layered = createLayers([[0n], [[0, 1]], [0n, 1], [[], 0], [0n], [[]]]);
  const coord = topological();
  const width = coord(layered, nodeSep);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("topological().straight(false) works for compact", () => {
  const layered = createLayers([[0n], [[0, 1]], [0n, 1], [[], 0], [0n], [[]]]);
  const coord = topological().straight(false);
  const width = coord(layered, nodeSep);
  for (const layer of layered) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("topological() throws for non-topological", () => {
  const layers = createLayers([[[0], [0]], [[]]]);
  expect(() => topological()(layers, nodeSep)).toThrow(
    "only works with a topological layering"
  );
});

test("topological() fails passing an arg to constructor", () => {
  expect(() => topological(null as never)).toThrow(
    "got arguments to coordTopological"
  );
});

test("topological() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  const coord = topological();
  expect(() => coord(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});

test("topological().straight(false) throws for zero width", () => {
  const layers = createLayers([[[]]]);
  const coord = topological().straight(false);
  expect(() => coord(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
