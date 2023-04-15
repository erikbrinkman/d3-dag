import { graphConnect } from "./graph/connect";
import { grid } from "./grid";
import { map } from "./iters";
import { sugiyama } from "./sugiyama";
import { zhere } from "./test-graphs";
import {
  shapeEllipse,
  shapeRect,
  tweakFlip,
  tweakGrid,
  tweakShape,
  tweakSize,
} from "./tweaks";

test("tweakSize()", () => {
  const layout = sugiyama().nodeSize([2, 2]);
  const grf = zhere();
  const old = layout(grf);
  const tweak = tweakSize({ width: 2, height: 3 });
  const res = tweak(grf, old);

  expect(res).toEqual({ width: 2, height: 3 });
  for (const node of grf.nodes()) {
    expect(node.x).toBeGreaterThanOrEqual(0);
    expect(node.x).toBeLessThanOrEqual(2);
    expect(node.y).toBeGreaterThanOrEqual(0);
    expect(node.y).toBeLessThanOrEqual(3);
  }
  for (const { points } of grf.links()) {
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(2);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(3);
    }
  }
});

test("tweakGrid()", () => {
  const layout = grid().nodeSize([2, 2]);
  const grf = zhere();
  const old = layout(grf);

  const oldLens = new Set<number>();
  for (const { points } of grf.links()) {
    oldLens.add(points.length);
  }
  expect([...oldLens].sort((a, b) => a - b)).toEqual([2, 3]);

  const tweak = tweakGrid([1, 1]);
  const res = tweak(grf, old);

  expect(res).toEqual(old);
  const newLens = new Set<number>();
  for (const { points } of grf.links()) {
    newLens.add(points.length);
  }
  expect([...newLens].sort((a, b) => a - b)).toEqual([2, 5]);
});

test("tweakGrid() throws for non-grid", () => {
  const builder = graphConnect();
  const grf = builder([
    ["1", "4"],
    ["1", "2"],
    ["2", "3"],
    ["3", "4"],
  ]);
  const layout = sugiyama().nodeSize([2, 2]);
  const old = layout(grf);
  const tweak = tweakGrid([1, 1]);
  expect(() => tweak(grf, old)).toThrow(
    "link points had more than three points"
  );
});

test("tweakFlip()", () => {
  const layout = sugiyama().nodeSize([2, 2]);
  const grf = zhere();
  const old = layout(grf);

  const xs = new Map([...map(grf.nodes(), (node) => [node, node.x] as const)]);
  const ys = new Map([...map(grf.nodes(), (node) => [node, node.y] as const)]);

  const diag = tweakFlip();
  const res = diag(grf, old);
  expect(res).toEqual({ width: old.height, height: old.width });
  for (const node of grf.nodes()) {
    expect(node.x).toBe(ys.get(node));
    expect(node.y).toBe(xs.get(node));
  }

  const horiz = tweakFlip("horizontal");
  const hres = horiz(grf, res);
  expect(hres).toEqual(res);
  for (const node of grf.nodes()) {
    expect(node.x).toBe(res.width - ys.get(node)!);
    expect(node.y).toBe(xs.get(node));
  }

  const vert = tweakFlip("vertical");
  const vres = vert(grf, hres);
  expect(vres).toEqual(res);
  for (const node of grf.nodes()) {
    expect(node.x).toBe(res.width - ys.get(node)!);
    expect(node.y).toBe(res.height - xs.get(node)!);
  }

  // @ts-expect-error invalid option
  expect(() => tweakFlip("unknown")).toThrow(
    `invalid tweakFlip style: "unknown"`
  );
});

test("tweakShape()", () => {
  const layout = sugiyama().nodeSize([2, 2]).gap([1, 1]);
  const grf = zhere();
  const old = layout(grf);

  const ellipse = tweakShape([2, 2], shapeEllipse);
  const eres = ellipse(grf, old);
  expect(eres).toEqual(old);
  for (const node of grf.nodes()) {
    const ref = [node.x, node.y];
    for (const { points } of node.parentLinks()) {
      const fin = points[points.length - 1];
      expect(fin).not.toEqual(ref);
    }
    for (const { points } of node.childLinks()) {
      const init = points[0];
      expect(init).not.toEqual(ref);
    }
  }

  const rect = tweakShape(() => [2, 2]);
  const rres = rect(grf, old);
  expect(rres).toEqual(old);
  for (const node of grf.nodes()) {
    const ref = [node.x, node.y];
    for (const { points } of node.parentLinks()) {
      const fin = points[points.length - 1];
      expect(fin).not.toEqual(ref);
    }
    for (const { points } of node.childLinks()) {
      const init = points[0];
      expect(init).not.toEqual(ref);
    }
  }
});

test("shapeRect()", () => {
  // rotations
  expect(shapeRect([0, 0], [2, 2], [0, 0], [0, 2])).toEqual([0, 1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [1, 2])).toEqual([0.5, 1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [2, 2])).toEqual([1, 1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [2, 1])).toEqual([1, 0.5]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [2, 0])).toEqual([1, 0]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [2, -1])).toEqual([1, -0.5]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [2, -2])).toEqual([1, -1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [1, -2])).toEqual([0.5, -1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [0, -2])).toEqual([0, -1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-1, -2])).toEqual([-0.5, -1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-2, -2])).toEqual([-1, -1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-2, -1])).toEqual([-1, -0.5]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-2, 0])).toEqual([-1, 0]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-2, 1])).toEqual([-1, 0.5]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-2, 2])).toEqual([-1, 1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [-1, 2])).toEqual([-0.5, 1]);

  // different widths
  expect(shapeRect([0, 0], [2, 4], [0, 0], [2, 2])).toEqual([1, 1]);

  // different start
  expect(shapeRect([0, 0], [2, 4], [0, 1], [2, 2])).toEqual([1, 1.5]);

  // different centers
  expect(shapeRect([1, 2], [2, 2], [1, 2], [3, 4])).toEqual([2, 3]);

  // non-intersecting
  expect(shapeRect([0, 0], [2, 2], [2, 3], [2, 2])).toEqual([2, 3]);

  // would intersect but early
  expect(shapeRect([0, 0], [2, 2], [2, 2], [3, 3])).toEqual([2, 2]);

  // would intersect but late
  expect(shapeRect([0, 0], [2, 2], [3, 3], [2, 2])).toEqual([3, 3]);

  // invalid end
  expect(() => shapeRect([0, 0], [2, 2], [2, 0], [0, 0])).toThrow(
    "ended inside rectangle"
  );
});

const r2 = 0.7071067811865476; // 1 / Math.sqrt(2);
const r5 = 0.447213595499958; // 1 / Math.sqrt(5)

test("shapeEllipse()", () => {
  // rotations
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [0, 2])).toEqual([0, 1]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [1, 2])).toEqual([r5, 2 * r5]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [2, 2])).toEqual([r2, r2]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [2, 1])).toEqual([2 * r5, r5]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [2, 0])).toEqual([1, 0]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [2, -1])).toEqual([2 * r5, -r5]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [2, -2])).toEqual([r2, -r2]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [1, -2])).toEqual([r5, -2 * r5]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [0, -2])).toEqual([0, -1]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-1, -2])).toEqual([
    -r5,
    -2 * r5,
  ]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-2, -2])).toEqual([-r2, -r2]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-2, -1])).toEqual([
    -2 * r5,
    -r5,
  ]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-2, 0])).toEqual([-1, 0]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-2, 1])).toEqual([-2 * r5, r5]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-2, 2])).toEqual([-r2, r2]);
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [-1, 2])).toEqual([-r5, 2 * r5]);

  // different widths
  expect(shapeEllipse([0, 0], [2, 4], [0, 0], [2, 2])).toEqual([
    2 * r5,
    2 * r5,
  ]);

  // different start
  expect(shapeEllipse([0, 0], [2, 4], [0, 1], [2, 2])).toEqual([
    0.7307179471679974, 1.3653589735839988,
  ]);

  // different centers
  expect(shapeEllipse([1, 2], [2, 2], [1, 2], [3, 4])).toEqual([
    1 + r2,
    2 + r2,
  ]);

  // non-intersecting
  expect(shapeEllipse([0, 0], [2, 2], [2, 3], [2, 2])).toEqual([2, 3]);

  // would intersect but early
  expect(shapeEllipse([0, 0], [2, 2], [2, 2], [3, 3])).toEqual([2, 2]);

  // would intersect but late
  expect(shapeEllipse([0, 0], [2, 2], [3, 3], [2, 2])).toEqual([3, 3]);

  // invalid end
  expect(() => shapeEllipse([0, 0], [2, 2], [2, 0], [0, 0])).toThrow(
    "ended inside ellipse"
  );
});
