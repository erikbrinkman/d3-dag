import { expect, test } from "bun:test";
import { graphConnect } from "./graph/connect.js";
import { graph } from "./graph/index.js";
import { grid } from "./grid/index.js";
import { sugiyama } from "./sugiyama/index.js";
import { zhere } from "./test-graphs.js";
import {
  shapeEllipse,
  shapeRect,
  shapeTopBottom,
  tweakDirection,
  tweakFlip,
  tweakGrid,
  tweakGridHandles,
  tweakShape,
  tweakSize,
  tweakSugiyama,
} from "./tweaks.js";

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

test("tweakSize() centers a layout with zero width", () => {
  const grf = graph<undefined, undefined>();
  const top = grf.node();
  const bottom = grf.node();
  top.child(bottom);
  const res = sugiyama().nodeSize([0, 1])(grf);
  expect(res.width).toBe(0);

  tweakSize({ width: 4, height: 6 })(grf, res);
  expect(top.x).toBe(2);
  expect(bottom.x).toBe(2);
  expect(bottom.y).toBeGreaterThan(top.y);
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

test("tweakGrid() keeps rounding within half of each segment", () => {
  const grf = zhere();
  const old = grid().nodeSize([1, 1]).gap([1, 1])(grf);
  const { width, height } = tweakGrid([5, 5])(grf, old);

  for (const { points } of grf.links()) {
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(height);
    }
    if (points.length === 5) {
      const [first, before, mid, after, last] = points;
      for (const [end, round] of [
        [first, before],
        [last, after],
      ]) {
        for (const axis of [0, 1]) {
          const half = (end[axis] + mid[axis]) / 2;
          expect(Math.abs(round[axis] - mid[axis])).toBeLessThanOrEqual(
            Math.abs(half - mid[axis]) + 1e-9,
          );
          expect(Math.sign(round[axis] - mid[axis])).toBe(
            Math.sign(end[axis] - mid[axis]),
          );
        }
      }
    }
  }
});

test("tweakGrid() keeps a corner that meets its neighbor", () => {
  const dag = graphConnect()([
    ["a", "b"],
    ["a", "c"],
  ]);
  grid()
    .nodeSize([1, 0])
    .gap([1, 0])
    .tweaks([tweakGrid([0.2, 0.2])])(dag);
  const [bent] = dag
    .links()
    .filter(({ source, target }) => source.x !== target.x);
  expect(bent.points).toEqual([
    [0.5, 0],
    [0.5, 0],
    [0.5, 0],
    [0.7, 0],
    [2.5, 0],
  ]);
});

test("tweakGrid() rounds a straight segment without NaN", () => {
  const dag = graphConnect()([
    ["a", "b"],
    ["a", "c"],
  ]);
  grid()
    .nodeSize([1, 1])
    .tweaks([tweakGrid([0, 1])])(dag);
  for (const { points } of dag.links()) {
    for (const [x, y] of points) {
      expect(x).not.toBeNaN();
      expect(y).not.toBeNaN();
    }
  }
});

test("tweakGrid() rounds the corners of self loops", () => {
  const dag = graphConnect()([["a", "a"]]);
  const layout = grid().tweaks([tweakGrid([0.25, 0.25])]);
  layout(dag);
  const [loop] = dag.links();
  expect(loop.points).toEqual([
    [0.5, 0.75],
    [1.25, 1.3125],
    [1.5, 1.5],
    [1.5, 1.25],
    [1.5, 0.25],
    [1.5, 0],
    [1.25, 0.1875],
    [0.5, 0.75],
  ]);
});

for (const rounding of [0.5, 1]) {
  test(`tweakGrid([${rounding}, ${rounding}]) doesn't zigzag several self loops`, () => {
    const dag = graphConnect()([
      ["a", "a"],
      ["a", "a"],
      ["a", "a"],
    ]);
    const { width, height } = grid()
      .nodeSize([1, 1])
      .gap([1, 1])
      .tweaks([tweakGrid([rounding, rounding])])(dag);

    for (const { points } of dag.links()) {
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
      for (const [[ax, ay], [bx, by], [cx, cy]] of points
        .slice(2)
        .map((point, ind) => [points[ind], points[ind + 1], point])) {
        const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
        if (Math.abs(cross) < 1e-9) {
          const dot = (bx - ax) * (cx - bx) + (by - ay) * (cy - by);
          expect(dot).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
}

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
    "link points had more than three points",
  );
});

test("tweakFlip()", () => {
  const layout = sugiyama().nodeSize([2, 2]);
  const grf = zhere();
  const old = layout(grf);

  const xs = new Map([...grf.nodes().map((node) => [node, node.x] as const)]);
  const ys = new Map([...grf.nodes().map((node) => [node, node.y] as const)]);

  const diag = tweakFlip();
  const res = diag(grf, old);
  expect(res).toEqual({ width: old.height, height: old.width });
  for (const node of grf.nodes()) {
    expect(node.x).toBe(ys.get(node)!);
    expect(node.y).toBe(xs.get(node)!);
  }

  const horiz = tweakFlip("horizontal");
  const hres = horiz(grf, res);
  expect(hres).toEqual(res);
  for (const node of grf.nodes()) {
    expect(node.x).toBe(res.width - ys.get(node)!);
    expect(node.y).toBe(xs.get(node)!);
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
    `invalid tweakFlip style: "unknown"`,
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

test("tweakShape() keeps no repeated points after tweakSugiyama()", () => {
  const expectDistinct = (points: readonly (readonly [number, number])[]) => {
    for (const [ind, [px, py]] of points.slice(1).entries()) {
      const [qx, qy] = points[ind];
      expect(Math.hypot(px - qx, py - qy)).toBeGreaterThan(1e-9);
    }
  };
  for (const shape of [shapeRect, shapeEllipse, shapeTopBottom]) {
    for (const size of [
      [2, 2],
      [0, 0],
      [0.14113, 2.03659],
    ] as const) {
      const grf = zhere();
      const res = sugiyama().nodeSize(size).gap([1, 1])(grf);
      tweakShape(size, shape)(grf, tweakSugiyama(size)(grf, res));
      for (const { points } of grf.links()) {
        expectDistinct(points);
      }
    }
  }

  const grf = graph<undefined, undefined>();
  const source = grf.node(undefined);
  const target = grf.node(undefined);
  const link = source.child(target);
  source.x = 0.4;
  source.y = 0;
  target.x = 0.4;
  target.y = 10;
  link.points = [
    [0.4, 0],
    [-0.3, 1],
    [0.4, 5],
    [0.4, 10],
  ];
  tweakShape([2, 2], shapeRect)(grf, { width: 2, height: 11 });
  expect(link.points[0]).toEqual([-0.3, 1]);
  expectDistinct(link.points);

  const wide = graph<undefined, undefined>();
  const wideSource = wide.node(undefined);
  const wideTarget = wide.node(undefined);
  const wideLink = wideSource.child(wideTarget);
  wideSource.x = 0;
  wideSource.y = 0;
  wideTarget.x = 0;
  wideTarget.y = 10;
  wideLink.points = [
    [0, 0],
    [2900, 0.4],
    [0, 0.5],
    [0, 10],
  ];
  tweakShape([10000, 1], shapeEllipse)(wide, { width: 10000, height: 11 });
  expect(wideLink.points[0]).toEqual([0, 0.5]);
  expectDistinct(wideLink.points);
});

test("tweakShape() drops segments inside the node", () => {
  const grf = graph<undefined, undefined>();
  const source = grf.node(undefined);
  const target = grf.node(undefined);
  const link = source.child(target);
  source.x = 0;
  source.y = 0;
  target.x = 0;
  target.y = 6;
  link.points = [
    [0, 0],
    [0.5, 0.5],
    [0.5, 1],
    [1, 3],
    [0, 5],
    [-0.5, 5.5],
    [0, 6],
  ];

  tweakShape([2, 2])(grf, { width: 2, height: 7 });
  expect(link.points).toEqual([
    [0.5, 1],
    [1, 3],
    [0, 5],
  ]);

  link.points = [
    [0, 0],
    [0.5, 0.5],
    [1, 3],
    [-0.5, 5.5],
    [0, 6],
  ];
  tweakShape([2, 2], shapeTopBottom)(grf, { width: 2, height: 7 });
  expect(link.points).toEqual([
    [0, 1],
    [1, 3],
    [0, 5],
  ]);

  link.points = [
    [1, 2],
    [1, 3],
    [1, 4],
  ];
  tweakShape([2, 2], shapeTopBottom)(grf, { width: 2, height: 7 });
  expect(link.points).toEqual([
    [1, 2],
    [1, 3],
    [1, 4],
  ]);
});

test("tweakShape() ends a vertical link on the ellipse", () => {
  const grf = graph<undefined, undefined>();
  const source = grf.node(undefined);
  const target = grf.node(undefined);
  const link = source.child(target);
  source.x = 0.4867092728614807;
  source.y = 7.119067478179932;
  target.x = source.x;
  target.y = 9;
  link.points = [
    [source.x, source.y],
    [target.x, target.y],
  ];

  const size = [0.3210141181945801, 0.48797398507595063] as const;
  tweakShape(size, shapeEllipse)(
    grf,
    tweakSugiyama(size)(grf, { width: 1, height: 10 }),
  );
  expect(link.points).toEqual([
    [source.x, source.y + size[1] / 2],
    [target.x, target.y - size[1] / 2],
  ]);
});

test("tweakShape() trims both ends of a self loop", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node(undefined);
  const link = node.child(node);
  node.x = 0;
  node.y = 0;
  link.points = [
    [0, 0],
    [2, 1],
    [2, -1],
    [0, 0],
  ];

  tweakShape([2, 2])(grf, { width: 3, height: 2 });
  expect(link.points).toEqual([
    [1, 0.5],
    [2, 1],
    [2, -1],
    [1, -0.5],
  ]);
});

test("tweakShape() ends a self loop on the top and bottom", () => {
  const dag = graphConnect()([["a", "a"]]);
  sugiyama()
    .nodeSize([2, 2])
    .tweaks([tweakShape<unknown, unknown>([2, 2], shapeTopBottom)])(dag);
  const [node] = dag.nodes();
  const [{ points }] = dag.links();
  expect(points[0]).toEqual([node.x, node.y + 1]);
  expect(points[points.length - 1]).toEqual([node.x, node.y - 1]);
});

test("tweakShape() takes a shape that always returns a point", () => {
  const grf = graph<undefined, undefined>();
  const source = grf.node(undefined);
  const target = grf.node(undefined);
  const link = source.child(target);
  source.x = 0;
  source.y = 0;
  target.x = 0;
  target.y = 4;
  link.points = [
    [0, 0],
    [0, 4],
  ];

  tweakShape([2, 2], ([cx, cy], [, height], [, sy], [, ey]) => [
    cx,
    cy + (Math.sign(ey - sy) * height) / 2,
  ])(grf, { width: 2, height: 4 });
  expect(link.points).toEqual([
    [0, 1],
    [0, 3],
  ]);
});

test("tweakShape() ends a link between touching nodes at the point they share", () => {
  for (const shape of [shapeRect, shapeEllipse, shapeTopBottom]) {
    const grf = graph<undefined, undefined>();
    const source = grf.node(undefined);
    const target = grf.node(undefined);
    const link = source.child(target);
    source.x = 0;
    source.y = 0;
    target.x = 0;
    target.y = 2;
    link.points = [
      [0, 0],
      [0, 2],
    ];

    tweakShape([2, 2], shape)(grf, { width: 2, height: 3 });
    expect(link.points).toEqual([
      [0, 1],
      [0, 1],
    ]);
  }
});

test("tweakShape() leaves links between zero-size nodes alone", () => {
  for (const shape of [shapeRect, shapeEllipse, shapeTopBottom]) {
    for (const ty of [0, 2]) {
      const grf = graph<undefined, undefined>();
      const source = grf.node(undefined);
      const target = grf.node(undefined);
      const link = source.child(target);
      source.x = 0;
      source.y = 0;
      target.x = 0;
      target.y = ty;
      link.points = [
        [0, 0],
        [1, 1],
        [0, ty],
      ];

      tweakShape([0, 0], shape)(grf, { width: 1, height: ty });
      expect(link.points).toEqual([
        [0, 0],
        [1, 1],
        [0, ty],
      ]);
    }
  }
});

test("tweakShape() throws for a link inside its node", () => {
  const grf = graph<undefined, undefined>();
  const source = grf.node(undefined);
  const target = grf.node(undefined);
  const link = source.child(target);
  source.x = 0;
  source.y = 0;
  target.x = 0;
  target.y = 1;
  link.points = [
    [0, 0],
    [0, 1],
  ];

  expect(() => tweakShape([2, 2])(grf, { width: 2, height: 2 })).toThrow(
    "lies entirely inside the node",
  );
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

  // leave from the border
  expect(shapeRect([0, 0], [2, 2], [0.5, 1], [0.5, 3])).toEqual([0.5, 1]);
  expect(shapeRect([0, 0], [2, 2], [-1, 0], [-3, 1])).toEqual([-1, 0]);

  // head in from the border
  expect(shapeRect([0, 0], [2, 2], [0.5, 1], [-1, 0])).toEqual([0.5, 1]);

  // end on the border
  expect(shapeRect([0, 0], [2, 2], [0, 0], [0.5, 1])).toEqual([0.5, 1]);
  expect(shapeRect([0, 0], [2, 2], [0, 0], [1, 1])).toEqual([1, 1]);
  expect(shapeRect([0.4, 0], [2, 2], [0.4, 0], [-0.3, 1])).toEqual([-0.3, 1]);

  // zero size
  expect(shapeRect([0, 0], [0, 0], [0, 0], [0, 0])).toEqual([0, 0]);
  expect(shapeRect([0, 0], [0, 0], [0, 0], [1, 1])).toEqual([0, 0]);

  // end inside
  expect(shapeRect([0, 0], [2, 2], [0, 0], [0.5, 0.5])).toBeUndefined();
  expect(shapeRect([0, 0], [2, 2], [-0.5, 0], [0.5, 0.5])).toBeUndefined();
});

const r2 = Math.SQRT1_2; // 1 / Math.sqrt(2);
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

  // leave from the border
  expect(shapeEllipse([0, 0], [2, 2], [0, 1], [1, 3])).toEqual([0, 1]);
  expect(shapeEllipse([0, 0], [2, 2], [1, 0], [3, 0])).toEqual([1, 0]);

  // head in from the border
  expect(shapeEllipse([0, 0], [2, 2], [0, 1], [0, -2])).toEqual([0, 1]);

  // end on the border
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [0, 1])).toEqual([0, 1]);
  expect(shapeEllipse([0, 0], [2, 2], [0.5, 0], [1, 0])).toEqual([1, 0]);

  // flat
  expect(shapeEllipse([0, 0], [2, 0], [0, 0], [0, 2])).toEqual([0, 0]);
  expect(shapeEllipse([0, 0], [2, 0], [0, 0], [2, 0])).toEqual([0, 0]);

  // zero size
  expect(shapeEllipse([0, 0], [0, 0], [0, 0], [0, 0])).toEqual([0, 0]);

  // end inside
  expect(shapeEllipse([0, 0], [2, 2], [0, 0], [0.5, 0.5])).toBeUndefined();
  expect(shapeEllipse([0, 0], [2, 2], [0, 0.5], [0.5, 0])).toBeUndefined();
});

test("shapeTopBottom()", () => {
  // rotations
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [0, 2])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [1, 2])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [2, 2])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [2, -2])).toEqual([0, -1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [1, -2])).toEqual([0, -1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [0, -2])).toEqual([0, -1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [-1, -2])).toEqual([0, -1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [-2, -2])).toEqual([0, -1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [-2, 2])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [-1, 2])).toEqual([0, 1]);

  // different widths
  expect(shapeTopBottom([0, 0], [2, 4], [0, 0], [3, 3])).toEqual([0, 2]);

  // different start
  expect(shapeTopBottom([0, 0], [2, 4], [0, 1], [3, 3])).toEqual([0, 2]);

  // different centers
  expect(shapeTopBottom([1, 2], [2, 2], [1, 2], [3, 4])).toEqual([1, 3]);

  // leave from the border
  expect(shapeTopBottom([0, 0], [2, 2], [0.5, 1], [0.5, 3])).toEqual([0.5, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [-0.5, -1], [0, -3])).toEqual([
    -0.5, -1,
  ]);

  // leave beside the node
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [2, 0.5])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [-2, -0.5])).toEqual([0, -1]);

  // start outside
  expect(shapeTopBottom([0, 0], [2, 2], [2, 3], [2, 2])).toEqual([2, 3]);
  expect(shapeTopBottom([0, 0], [2, 2], [2, 0], [0, 0])).toEqual([2, 0]);

  // leave level
  expect(() => shapeTopBottom([0, 0], [2, 2], [0, 0], [2, 0])).toThrow(
    "heading neither up nor down",
  );

  // end inside
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [0.5, 0.5])).toBeUndefined();
  expect(shapeTopBottom([0, 0], [2, 2], [0.5, 0], [0, -0.5])).toBeUndefined();

  // end on the border
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [0.5, 1])).toEqual([0, 1]);
  expect(shapeTopBottom([0, 0], [2, 2], [0, 0], [1, -0.5])).toEqual([0, -1]);

  // zero size
  expect(shapeTopBottom([0, 0], [0, 0], [0, 0], [0, 1])).toEqual([0, 0]);
});

test("tweakSugiyama() simple", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 1;
  b.x = 1;
  b.y = 4;
  link.points = [
    [1, 1],
    [1, 4],
  ];

  const tweak = tweakSugiyama([2, 2]);
  const { width, height } = tweak(grf, { width: 2, height: 5 });
  expect(width).toBe(2);
  expect(height).toBe(5);

  expect(link.points).toEqual([
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
  ]);
});

test("tweakSugiyama() simple reverse", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 4;
  b.x = 1;
  b.y = 1;
  link.points = [
    [1, 4],
    [1, 1],
  ];

  const tweak = tweakSugiyama([2, 2]);
  const { width, height } = tweak(grf, { width: 2, height: 5 });
  expect(width).toBe(2);
  expect(height).toBe(5);

  expect(link.points).toEqual([
    [1, 4],
    [1, 3],
    [1, 2],
    [1, 1],
  ]);
});

test("tweakSugiyama() clipped", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 1;
  b.x = 5;
  b.y = 4;
  link.points = [
    [1, 1],
    [5, 4],
  ];

  const tweak = tweakSugiyama([2, 2]);
  const { width, height } = tweak(grf, { width: 6, height: 5 });
  expect(width).toBe(6);
  expect(height).toBe(5);

  expect(link.points).toEqual([
    [1, 1],
    [2, 2],
    [4, 3],
    [5, 4],
  ]);
});

test("tweakSugiyama() reads node sizes fresh on each call", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);
  a.x = 1;
  a.y = 1;
  b.x = 5;
  b.y = 4;

  let size = 2;
  const tweak = tweakSugiyama((): [number, number] => [size, size]);
  link.points = [
    [1, 1],
    [5, 4],
  ];
  tweak(grf, { width: 6, height: 5 });

  size = 4;
  link.points = [
    [1, 1],
    [5, 4],
  ];
  tweak(grf, { width: 6, height: 5 });
  const second = link.points;

  link.points = [
    [1, 1],
    [5, 4],
  ];
  tweakSugiyama([4, 4])(grf, { width: 6, height: 5 });
  expect(second).toEqual(link.points);
});

test("tweakSugiyama() clipped single", () => {
  // This tests that we set the clip based on the original edge, not by
  // clipping one then the other.
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 1;
  b.x = 7;
  b.y = 4;
  link.points = [
    [1, 1],
    [7, 4],
  ];

  const tweak = tweakSugiyama(({ data }) => (data ? [2, 2] : [6, 2]));
  const { width, height } = tweak(grf, { width: 10, height: 5 });
  expect(width).toBe(10);
  expect(height).toBe(5);

  expect(link.points).toEqual([
    [1, 1],
    [2, 2],
    [5, 3],
    [7, 4],
  ]);
});

test("tweakSugiyama() edge case", () => {
  // this tests a really bizarre horizontal edge edge case
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 1;
  b.x = 4;
  b.y = 4;
  link.points = [
    [1, 2],
    [4, 2],
  ];

  const tweak = tweakSugiyama([2, 2]);
  const { width, height } = tweak(grf, { width: 5, height: 5 });
  expect(width).toBe(5);
  expect(height).toBe(5);

  expect(link.points).toEqual([
    [1, 2],
    [1, 2],
    [4, 2],
  ]);
});

test("tweakGridHandles() shifts bend points", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 3;
  b.y = 4;
  // three-point edge: source → bend at source.y → target
  link.points = [
    [1, 0],
    [3, 0],
    [3, 4],
  ];

  const tweak = tweakGridHandles([2, 2], [1, 2]);
  const res = tweak(grf, { width: 4, height: 6 });
  expect(res).toEqual({ width: 4, height: 6 });

  // middle point was at source.y (0), should be shifted down by srcH/2 + ygap/2 = 1 + 1 = 2
  expect(link.points[1]).toEqual([3, 2]);
});

test("tweakGridHandles() skips two-point edges", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  const link = a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 1;
  b.y = 4;
  link.points = [
    [1, 0],
    [1, 4],
  ];

  const tweak = tweakGridHandles([2, 2], [1, 2]);
  tweak(grf, { width: 2, height: 6 });

  // two-point (vertical) edge should be unchanged
  expect(link.points).toEqual([
    [1, 0],
    [1, 4],
  ]);
});

test("tweakDirection() TB is identity", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 1;
  b.y = 2;

  const tweak = tweakDirection("TB");
  const res = tweak(grf, { width: 2, height: 3 });
  expect(res).toEqual({ width: 2, height: 3 });
  expect(a.x).toBe(1);
  expect(a.y).toBe(0);
  expect(b.x).toBe(1);
  expect(b.y).toBe(2);
});

test("tweakDirection() BT flips vertically", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 1;
  b.y = 2;

  const tweak = tweakDirection("BT");
  const res = tweak(grf, { width: 2, height: 3 });
  expect(res).toEqual({ width: 2, height: 3 });
  expect(a.x).toBe(1);
  expect(a.y).toBe(3);
  expect(b.x).toBe(1);
  expect(b.y).toBe(1);
});

test("tweakDirection() LR flips diagonally", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 1;
  b.y = 2;

  const tweak = tweakDirection("LR");
  const res = tweak(grf, { width: 2, height: 3 });
  expect(res).toEqual({ width: 3, height: 2 });
  expect(a.x).toBe(0);
  expect(a.y).toBe(1);
  expect(b.x).toBe(2);
  expect(b.y).toBe(1);
});

test("tweakDirection() RL flips diagonal then horizontal", () => {
  const grf = graph<boolean, undefined>();
  const a = grf.node(true);
  const b = grf.node(false);
  a.child(b);

  a.x = 1;
  a.y = 0;
  b.x = 1;
  b.y = 2;

  const tweak = tweakDirection("RL");
  const res = tweak(grf, { width: 2, height: 3 });
  expect(res).toEqual({ width: 3, height: 2 });
  // diagonal: (1,0) → (0,1), then horizontal flip: (0,1) → (3,1)
  expect(a.x).toBe(3);
  expect(a.y).toBe(1);
  // diagonal: (1,2) → (2,1), then horizontal flip: (2,1) → (1,1)
  expect(b.x).toBe(1);
  expect(b.y).toBe(1);
});
