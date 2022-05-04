import { flatMap } from "../../../src/iters";
import {
  createConstAccessor,
  simplex,
} from "../../../src/sugiyama/coord/simplex";
import { SugiNode } from "../../../src/sugiyama/utils";
import { createLayers, nodeSize } from "../utils";

test("simplex() modifiers work", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);

  const weight = () => [2, 3, 4] as const;
  const layout = simplex().weight(weight);
  expect(layout.weight()).toBe(weight);
  layout(layers, nodeSize);

  for (const node of flatMap(layers, (l) => l)) {
    expect(node.x).toBeDefined();
  }
});

test("simplex() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  const layout = simplex();
  const width = layout(layers, nodeSize);

  expect(width).toBeCloseTo(2);

  // NOTE head and tail could be at either 0.5 or 1.5
  expect(head.x).toBeCloseTo(1.5);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.5);
});

test("simplex() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [0, [0]], [[]]]);
  const [[one], [dummy, two], [three]] = layers;
  const layout = simplex();
  const dummyNodeSize = (node: SugiNode): number =>
    "node" in node.data ? 1 : 0;
  const width = layout(layers, dummyNodeSize);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(width).toBeCloseTo(1.5);
  expect(one.x).toBeCloseTo(0.5);
  expect(dummy.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.0);
});

test("simplex() works for dee", () => {
  const layers = createLayers([[[0, 1]], [0, [1]], [0, [0]], [[]]]);
  const [[one], [d1, two], [d2, three], [four]] = layers;
  const layout = simplex();
  layout(layers, nodeSize);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(one.x).toBeCloseTo(0.5);
  expect(d1.x).toBeCloseTo(0.5);
  expect(d2.x).toBeCloseTo(0.5);
  expect(four.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(1.5);
});

test("simplex() works for dee with custom weights", () => {
  const layers = createLayers([[[0, 1]], [0, [1]], [0, [0]], [[]]]);
  const [[one], [d1, two], [d2, three], [four]] = layers;
  const layout = simplex().weight(() => [2, 3, 4]);
  layout(layers, nodeSize);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(one.x).toBeCloseTo(0.5);
  expect(d1.x).toBeCloseTo(0.5);
  expect(d2.x).toBeCloseTo(0.5);
  expect(four.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(1.5);
});

test("simplex() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]], [[]]]);
  const [[left, right], [high], [low]] = layers;
  const layout = simplex();
  layout(layers, nodeSize);

  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(high.x).toBeCloseTo(1.0);
  expect(low.x).toBeCloseTo(1.0);
});

test("simplex() works with complex disconnected component", () => {
  const layers = createLayers([[[0], [], [0]], [[], [0]], [[]]]);
  const [[left, middle, right], [vee, above], [below]] = layers;
  const layout = simplex();
  layout(layers, nodeSize);

  expect(left.x).toBeCloseTo(0.5);
  expect(middle.x).toBeCloseTo(1.5);
  expect(right.x).toBeCloseTo(2.5);
  expect(vee.x).toBeCloseTo(2.5);
  expect(above.x).toBeCloseTo(3.5);
  expect(below.x).toBeCloseTo(3.5);
});

test("simplex() fails with non-positive const weight", () => {
  const weights = [0, 1, 2] as const;
  function weight(): readonly [number, number, number] {
    return weights;
  }
  // make a const accessor, but don't go through checks of "create"
  weight.value = weights;

  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = simplex().weight(weight);
  expect(() => layout(layers, nodeSize)).toThrow(
    "simplex weights must be positive, but got"
  );
});

test("simplex() fails with non-positive weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = simplex().weight(() => [0, 1, 2]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "simplex weights must be positive, but got"
  );
});

test("simplex() fails passing an arg to constructor", () => {
  expect(() => simplex(null as never)).toThrow("got arguments to simplex");
});

test("simplex() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  const layout = simplex();
  expect(() => layout(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});

test("createConstAccessor() works", () => {
  const acc = createConstAccessor([1, 2, 3]);
  expect(acc.value).toEqual([1, 2, 3]);
  expect(acc()).toEqual([1, 2, 3]);
});

test("createConstAccessor() throws for non-positive value", () => {
  expect(() => createConstAccessor([0, 1, 2])).toThrow(
    "const accessors should return non-negative values"
  );
});
