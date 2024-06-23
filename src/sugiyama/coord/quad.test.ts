import { expect, test } from "bun:test";
import { Coord } from ".";
import { GraphLink } from "../../graph";
import { createLayers, nodeSep } from "../test-utils";
import { coordQuad } from "./quad";

test("coordQuad() modifiers work", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);

  const comp = 0.5;
  function vertWeak({ source, target }: GraphLink<{ layer: number }>): number {
    return source.data.layer + target.data.layer + 1;
  }
  function vertStrong({
    source,
    target,
  }: GraphLink<{ index: number | string }>): number {
    return +source.data.index + +target.data.index + 1;
  }
  function linkCurve({ data }: { data: undefined }): number {
    return data ?? 1;
  }
  function nodeCurve({ data }: { data: { index: number } }): number {
    return data.index + 1;
  }

  const init = coordQuad() satisfies Coord<unknown, unknown>;
  const vert = init.vertWeak(vertWeak).vertStrong(vertStrong);
  vert satisfies Coord<{ layer: number; index: number | string }, unknown>;
  // @ts-expect-error invalid data
  vert satisfies Coord<unknown, unknown>;
  const advanced = vert
    .linkCurve(linkCurve)
    .nodeCurve(nodeCurve)
    .compress(comp);
  advanced satisfies Coord<{ index: number; layer: number }, undefined>;
  // @ts-expect-error invalid data
  advanced satisfies Coord<{ layer: number; index: number | string }, unknown>;
  expect(advanced.vertWeak() satisfies typeof vertWeak).toBe(vertWeak);
  expect(advanced.vertStrong() satisfies typeof vertStrong).toBe(vertStrong);
  expect(advanced.linkCurve() satisfies typeof linkCurve).toBe(linkCurve);
  expect(advanced.nodeCurve() satisfies typeof nodeCurve).toBe(nodeCurve);
  expect(advanced.compress()).toEqual(comp);
  advanced(layers, nodeSep);
});

test("coordQuad() works for square like layout", () => {
  const layers = createLayers([[[0, 1]], [[0], [0]], [[]]]);
  const [[head], [left, right], [tail]] = layers;
  coordQuad()(layers, nodeSep);

  expect(head.x).toBeCloseTo(1.0);
  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(tail.x).toBeCloseTo(1.0);
});

test("coordQuad() works for triangle", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const [[one], [two, dummy], [three]] = layers;
  coordQuad()(layers, nodeSep);

  expect(one.x).toBeCloseTo(1.1);
  expect(two.x).toBeCloseTo(0.5);
  expect(three.x).toBeCloseTo(1.1);
  expect(dummy.x).toBeCloseTo(1.5);
});

test("coordQuad() works with flat disconnected component", () => {
  const layers = createLayers([[[], []], [[0]], [[]]]);
  const [[left, right], [high], [low]] = layers;
  coordQuad()(layers, nodeSep);

  expect(left.x).toBeCloseTo(0.5);
  expect(right.x).toBeCloseTo(1.5);
  expect(high.x).toBeCloseTo(1.0);
  expect(low.x).toBeCloseTo(1.0);
});

test("coordQuad() works with constrained disconnected components", () => {
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
  const layout = coordQuad();
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

test("coordQuad() works with compact dag", () => {
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
  const layout = coordQuad();
  const width = layout(layers, nodeSep);

  expect(width).toBeCloseTo(3);
  for (const layer of layers) {
    for (const node of layer) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
    }
  }
});

test("coordQuad() fails with invalid weights", () => {
  const layout = coordQuad();
  expect(() => layout.compress(0)).toThrow(
    "compress weight must be positive, but was: 0",
  );
});

test("coordQuad() fails with negative constant vert weak", () => {
  const layout = coordQuad();
  expect(() => layout.vertWeak(-1)).toThrow("vertWeak must be non-negative");
});

test("coordQuad() fails with negative constant vert string", () => {
  const layout = coordQuad();
  expect(() => layout.vertStrong(-1)).toThrow(
    "vertStrong must be non-negative",
  );
});

test("coordQuad() fails with negative constant link curve", () => {
  const layout = coordQuad();
  expect(() => layout.linkCurve(-1)).toThrow("linkCurve must be non-negative");
});

test("coordQuad() fails with negative constant node curve", () => {
  const layout = coordQuad();
  expect(() => layout.nodeCurve(-1)).toThrow("nodeCurve must be non-negative");
});

test("coordQuad() fails with negative vert weak", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = coordQuad().vertWeak(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `link weights must be non-negative`,
  );
});

test("coordQuad() fails with negative link weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = coordQuad().linkCurve(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `link weights must be non-negative`,
  );
});

test("coordQuad() fails with negative node weight", () => {
  const layers = createLayers([[[0, 1]], [[0], 0], [[]]]);
  const layout = coordQuad().nodeCurve(() => -1);
  expect(() => layout(layers, nodeSep)).toThrow(
    `node weights must be non-negative`,
  );
});

test("coordQuad() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => coordQuad(null)).toThrow("got arguments to coordQuad");
});

test("coordQuad() throws for zero width", () => {
  const layers = createLayers([[[]]]);
  expect(() => coordQuad()(layers, () => 0)).toThrow(
    "must assign nonzero width to at least one node",
  );
});
