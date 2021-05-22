import { createLayers, nodeSize } from "../utils";

import { coordQuad } from "../../../src";

test("coordQuad() modifiers work", () => {
  const vert = [0.1, 0.2] as const;
  const curv = [0.3, 0.4] as const;
  const comp = 0.5;
  const layout = coordQuad().vertical(vert).curve(curv).component(comp);
  expect(layout.vertical()).toEqual(vert);
  expect(layout.curve()).toEqual(curv);
  expect(layout.component()).toEqual(comp);
});

test("coordQuad() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]]]);
  const [[head], [left, right], [tail]] = layers;
  coordQuad()(layers, nodeSize);

  expect(head.x).toBeCloseTo(1.0);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.0);
});

test("coordQuad() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0]]);
  const [[one], [two, dummy], [three]] = layers;
  coordQuad()(layers, nodeSize);

  expect(one.x).toBeCloseTo(1.1);
  expect(two.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(1.1);
  expect(dummy.x).toBeCloseTo(1.5);
});

test("coordQuad() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]]]);
  const [[left, right], [high], [low]] = layers;
  coordQuad()(layers, nodeSize);

  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(high.x).toBeCloseTo(1.0);
  expect(low.x).toBeCloseTo(1.0);
});

test("coordQuad() fails with invalid weights", () => {
  const layout = coordQuad();
  expect(() => layout.vertical([-1, 0])).toThrow(
    "weights must be non-negative, but were -1 and 0"
  );
  expect(() => layout.vertical([0, -1])).toThrow(
    "weights must be non-negative, but were 0 and -1"
  );
  expect(() => layout.curve([-1, 0])).toThrow(
    "weights must be non-negative, but were -1 and 0"
  );
  expect(() => layout.curve([0, -1])).toThrow(
    "weights must be non-negative, but were 0 and -1"
  );
  expect(() => layout.component(0)).toThrow(
    "weight must be positive, but was 0"
  );
});

test("coordQuad() fails with two node zeros", () => {
  const layers = createLayers([[[0, 1]]]);
  const layout = coordQuad().vertical([0, 1]).curve([0, 1]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "node vertical weight or node curve weight needs to be positive"
  );
});

test("coordQuad() fails with two dummy zeros", () => {
  const layers = createLayers([[[0, 1]]]);
  const layout = coordQuad().vertical([1, 0]).curve([1, 0]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "dummy vertical weight or dummy curve weight needs to be positive"
  );
});

test("coordQuad() fails passing an arg to constructor", () => {
  // @ts-expect-error quad takes no arguments
  expect(() => coordQuad(undefined)).toThrow("got arguments to quad");
});

test("coordQuad() throws for zero width", () => {
  const layers = createLayers([[[0]]]);
  expect(() => coordQuad()(layers, () => [0, 1])).toThrow(
    "must assign nonzero width to at least one node"
  );
});
