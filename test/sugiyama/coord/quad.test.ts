import { DagLink } from "../../../src/dag";
import { createConstAccessor, quad } from "../../../src/sugiyama/coord/quad";
import { createLayers, nodeSize } from "../utils";

test("quad() modifiers work", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);

  const vert = [0.1, 0.2] as const;
  const curv = [0.3, 0.4] as const;
  const comp = 0.5;
  const layout = quad().vertical(vert).curve(curv).component(comp);
  expect(layout.vertical()).toEqual(vert);
  expect(layout.curve()).toEqual(curv);
  expect(layout.component()).toEqual(comp);
  layout(layers, nodeSize);

  const vertWeak = () => 2;
  const vertStrong = () => 3;
  const linkCurve = () => 4;
  const nodeCurve = () => 5;
  const advanced = layout
    .vertWeak(vertWeak)
    .vertStrong(vertStrong)
    .linkCurve(linkCurve)
    .nodeCurve(nodeCurve);
  expect(advanced.vertWeak()).toBe(vertWeak);
  expect(advanced.vertStrong()).toBe(vertStrong);
  expect(advanced.linkCurve()).toBe(linkCurve);
  expect(advanced.nodeCurve()).toBe(nodeCurve);
  expect(advanced.vertical()).toBe(null);
  expect(advanced.curve()).toBe(null);
  advanced(layers, nodeSize);
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

test("quad() works with constrained disconnected components", () => {
  // NOTE before the top and bottom nodes would be pulled together by the
  // connected component minimization, but since they're not constrained due to
  // overlap, we can ignore it in this test case
  const layers = createLayers([
    [[0], [1, 3]],
    [[0], [], [0], [1]],
    [[], []]
  ]);
  const [[atop, btop], [aleft, bleft, aright, bright], [abottom, bbottom]] =
    layers;
  const layout = quad();
  const width = layout(layers, nodeSize);

  expect(width).toBeCloseTo(4);
  expect(atop.x).toBeCloseTo(0.5);
  expect(aleft.x).toBeCloseTo(0.5);
  expect(aright.x).toBeCloseTo(2.5);
  expect(abottom.x).toBeCloseTo(1.5);
  expect(btop.x).toBeCloseTo(2.5);
  expect(bleft.x).toBeCloseTo(1.5);
  expect(bright.x).toBeCloseTo(3.5);
  expect(bbottom.x).toBeCloseTo(3.5);
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
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().vertical([0, 1]).curve([0, 1]);
  expect(() => layout(layers, nodeSize)).toThrow(
    "quad objective wasn't well defined"
  );
});

test("quad() fails with non-const value vertWeak", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);

  const vertWeak = ({ source, target }: DagLink<{ index: number }, unknown>) =>
    source.data.index + target.data.index;
  vertWeak.value = 1;

  const layout = quad().vertWeak(vertWeak);
  expect(() => layout(layers, nodeSize)).toThrow(
    "passed in a vertWeak accessor with a `value` property that wasn't a const accessor"
  );
});

test("quad() fails with negative link weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().linkCurve(() => -1);
  expect(() => layout(layers, nodeSize)).toThrow(
    "link weights must be non-negative"
  );
});

test("quad() fails with negative node weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().nodeCurve(() => -1);
  expect(() => layout(layers, nodeSize)).toThrow(
    "node weights must be non-negative"
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

test("createConstAccessor() throws for negative value", () => {
  expect(() => createConstAccessor(-1)).toThrow(
    "const accessors should return non-negative values"
  );
});
