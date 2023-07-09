import { Coord } from ".";
import { GraphLink } from "../../graph";
import { flatMap } from "../../iters";
import { sugiNodeLength } from "../sugify";
import { createLayers, nodeSep } from "../test-utils";
import { sizedSeparation } from "../utils";
import { coordSimplex } from "./simplex";

test("coordSimplex() modifiers work", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  function weight({
    source,
    target,
  }: GraphLink<{ index: number }>): [number, number, number] {
    return [source.data.index == target.data.index ? 1 : 2, 3, 4];
  }

  const init = coordSimplex() satisfies Coord<unknown, unknown>;

  const layout = init.weight(weight) satisfies Coord<
    { index: number },
    unknown
  >;
  // @ts-expect-error new weight
  layout satisfies Coord<unknown, unknown>;

  expect(layout.weight() satisfies typeof weight).toBe(weight);
  layout(layers, nodeSep);

  for (const node of flatMap(layers, (l) => l)) {
    expect(node.x).toBeDefined();
  }
});

test("coordSimplex() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  const layout = coordSimplex();
  const width = layout(layers, nodeSep);

  expect(width).toBeCloseTo(2);

  // NOTE head and tail could be at either 0.5 or 1.5
  expect(head.x).toBeCloseTo(1.5);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.5);
});

test("coordSimplex() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [0, [0]], [[]]]);
  const [[one], [dummy, two], [three]] = layers;
  const layout = coordSimplex();
  const sep = sizedSeparation(
    sugiNodeLength(() => 1),
    0,
  );
  const width = layout(layers, sep);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(width).toBeCloseTo(1.5);
  expect(one.x).toBeCloseTo(0.5);
  expect(dummy.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.0);
});

test("coordSimplex() works for dee", () => {
  const layers = createLayers([[[0, 1]], [0, [1]], [0, [0]], [[]]]);
  const [[one], [d1, two], [d2, three], [four]] = layers;
  const layout = coordSimplex();
  layout(layers, nodeSep);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(one.x).toBeCloseTo(0.5);
  expect(d1.x).toBeCloseTo(0.5);
  expect(d2.x).toBeCloseTo(0.5);
  expect(four.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(1.5);
});

test("coordSimplex() works for dee with custom weights", () => {
  const layers = createLayers([[[0, 1]], [0, [1]], [0, [0]], [[]]]);
  const [[one], [d1, two], [d2, three], [four]] = layers;
  const layout = coordSimplex().weight(() => [2, 3, 4]);
  layout(layers, nodeSep);

  // NOTE with dummy node first, we guarantee that that's the straight line
  expect(one.x).toBeCloseTo(0.5);
  expect(d1.x).toBeCloseTo(0.5);
  expect(d2.x).toBeCloseTo(0.5);
  expect(four.x).toBeCloseTo(0.5);
  expect(two.x).toBeCloseTo(1.5);
  expect(three.x).toBeCloseTo(1.5);
});

test("coordSimplex() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]], [[]]]);
  const [[left, right], [high], [low]] = layers;
  const layout = coordSimplex();
  layout(layers, nodeSep);

  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(high.x).toBeCloseTo(0.5);
  expect(low.x).toBeCloseTo(0.5);
});

test("coordSimplex() works with complex disconnected component", () => {
  const layers = createLayers([[[0], [], [0]], [[], [0]], [[]]]);
  const [[left, middle, right], [vee, above], [below]] = layers;
  const layout = coordSimplex();
  layout(layers, nodeSep);

  expect(left.x).toBeCloseTo(0.5);
  expect(middle.x).toBeCloseTo(1.5);
  expect(right.x).toBeCloseTo(2.5);
  expect(vee.x).toBeCloseTo(2.5);
  expect(above.x).toBeCloseTo(3.5);
  expect(below.x).toBeCloseTo(3.5);
});

test("coordSimplex() works with compact dag", () => {
  //    r
  //   / \
  //  /   #
  // l  c r
  //  \   #
  //   \ /
  //    t
  const layers = createLayers([
    [0n],
    [[0, 1]],
    [0, 2n],
    [0n, 1n, 2n],
    [[0], [], 1n],
    [0, [0]],
    [0n],
    [[]],
  ]);
  const [[root], , [topDummy], [left, center, right], , [bottomDummy], [tail]] =
    layers;
  const layout = coordSimplex();
  const width = layout(layers, nodeSep);

  expect(width).toBeCloseTo(3);
  expect(root.x).toBeCloseTo(0.5);
  expect(topDummy.x).toBeCloseTo(0.5);
  expect(left.x).toBeCloseTo(0.5);
  expect(center.x).toBeCloseTo(1.5);
  expect(right.x).toBeCloseTo(2.5);
  expect(bottomDummy.x).toBeCloseTo(0.5);
  expect(tail.x).toBeCloseTo(0.5);
});

test("coordSimplex() fails with non-positive constant weight", () => {
  const layout = coordSimplex();
  expect(() => layout.weight([0, 1, 2])).toThrow(
    "simplex weights must be positive, but got",
  );
});

test("coordSimplex() fails with non-positive weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = coordSimplex().weight(() => [0, 1, 2]);
  expect(() => layout(layers, nodeSep)).toThrow(
    "simplex weights must be positive, but got",
  );
});

test("coordSimplex() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => coordSimplex(null)).toThrow("got arguments to coordSimplex");
});

test("coordSimplex() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  const layout = coordSimplex();
  expect(() => layout(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node",
  );
});
