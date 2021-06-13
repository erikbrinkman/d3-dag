import { createLayers, nodeSize } from "../utils";

import { quad } from "../../../src/sugiyama/coord/quad";

test("quad() modifiers work", () => {
  const vert = [0.1, 0.2] as const;
  const curv = [0.3, 0.4] as const;
  const comp = 0.5;
  const layout = quad().vertical(vert).curve(curv).component(comp);
  expect(layout.vertical()).toEqual(vert);
  expect(layout.curve()).toEqual(curv);
  expect(layout.component()).toEqual(comp);
});

test("quad() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  quad()(layers, nodeSize);

  expect(head.x).toBeCloseTo(1.0);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.0);
});

test("quad() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  quad()(layers, nodeSize);

  expect(one.x).toBeCloseTo(1.1);
  expect(two.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(1.1);
  expect(dummy.x).toBeCloseTo(1.5);
});

test("quad() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]], [[]]]);
  const [[left, right], [high], [low]] = layers;
  quad()(layers, nodeSize);

  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(high.x).toBeCloseTo(1.0);
  expect(low.x).toBeCloseTo(1.0);
});

test("quad() fails with invalid weights", () => {
  const layout = quad();
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

test("quad() fails with two node zeros", () => {
  const layers = createLayers([[[]]]);
  const layout = quad().vertical([0, 1]).curve([0, 1]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "node vertical weight or node curve weight needs to be positive"
  );
});

test("quad() fails with two dummy zeros", () => {
  const layers = createLayers([[[]]]);
  const layout = quad().vertical([1, 0]).curve([1, 0]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "dummy vertical weight or dummy curve weight needs to be positive"
  );
});

test("quad() fails passing an arg to constructor", () => {
  expect(() => quad(null as never)).toThrow("got arguments to quad");
});

test("quad() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => quad()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
