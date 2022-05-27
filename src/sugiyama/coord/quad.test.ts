import { createLayers, nodeSep } from "../test-utils";
import { coordQuad as quad } from "./quad";

test("quad() modifiers work", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);

  const comp = 0.5;
  const vertWeak = () => 2;
  const vertStrong = () => 3;
  const linkCurve = () => 4;
  const nodeCurve = () => 5;
  const advanced = quad()
    .vertWeak(vertWeak)
    .vertStrong(vertStrong)
    .linkCurve(linkCurve)
    .nodeCurve(nodeCurve)
    .compress(comp);
  expect(advanced.vertWeak()).toBe(vertWeak);
  expect(advanced.vertStrong()).toBe(vertStrong);
  expect(advanced.linkCurve()).toBe(linkCurve);
  expect(advanced.nodeCurve()).toBe(nodeCurve);
  expect(advanced.compress()).toEqual(comp);
  advanced(layers, nodeSep);
});

test("quad() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  quad()(layers, nodeSep);

  expect(head.x).toBeCloseTo(1.0);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.0);
});

test("quad() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  quad()(layers, nodeSep);

  expect(one.x).toBeCloseTo(1.1);
  expect(two.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(1.1);
  expect(dummy.x).toBeCloseTo(1.5);
});

test("quad() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]], [[]]]);
  const [[left, right], [high], [low]] = layers;
  quad()(layers, nodeSep);

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
    [[], []],
  ]);
  const [[atop, btop], [aleft, bleft, aright, bright], [abottom, bbottom]] =
    layers;
  const layout = quad();
  const width = layout(layers, nodeSep);

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
  expect(() => layout.compress(0)).toThrow(
    "compress weight must be positive, but was: 0"
  );
});

test("quad() fails with negative constant vert weak", () => {
  const layout = quad();
  expect(() => layout.vertWeak(-1)).toThrow("vertWeak must be non-negative");
});

test("quad() fails with negative constant vert string", () => {
  const layout = quad();
  expect(() => layout.vertStrong(-1)).toThrow(
    "vertStrong must be non-negative"
  );
});

test("quad() fails with negative constant link curve", () => {
  const layout = quad();
  expect(() => layout.linkCurve(-1)).toThrow("linkCurve must be non-negative");
});

test("quad() fails with negative constant node curve", () => {
  const layout = quad();
  expect(() => layout.nodeCurve(-1)).toThrow("nodeCurve must be non-negative");
});

test("quad() fails with negative vert weak", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().vertWeak(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `link weights must be non-negative`
  );
});

test("quad() fails with negative link weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().linkCurve(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `link weights must be non-negative`
  );
});

test("quad() fails with negative node weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = quad().nodeCurve(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `node weights must be non-negative`
  );
});

test("quad() fails passing an arg to constructor", () => {
  expect(() => quad(null as never)).toThrow("got arguments to coordQuad");
});

test("quad() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => quad()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node"
  );
});
