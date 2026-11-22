import { expect, test } from "bun:test";
import { graphConnect } from "../graph/connect.js";
import { type Graph, type GraphNode, graph } from "../graph/index.js";
import { bigrams } from "../iters.js";
import type { LayoutResult } from "../layout.js";
import { drawLoops } from "../loops.js";
import {
  ccoz,
  doub,
  dummy,
  en,
  ex,
  eye,
  line,
  loop,
  loops,
  multi,
  oh,
  single,
  square,
  three,
  trip,
  zhere,
} from "../test-graphs.js";
import { loopCrossings } from "../test-utils.js";
import { tweakSize } from "../tweaks.js";
import { zherebko } from "./index.js";

type Zhere<N, L> = (inp: Graph<N, L>) => LayoutResult;

test("zherebko() works for empty graph", () => {
  const grf = graph();
  const layout = zherebko();
  const { width, height } = layout(grf);
  expect(width).toEqual(0);
  expect(height).toEqual(0);
});

test("zherebko() allows setting custom operators", () => {
  function rank({ data }: { data: { rank: number } }): number | undefined {
    return data.rank;
  }

  function size({ data }: { data: { size: number } }): [number, number] {
    return [data.size, data.size];
  }

  function tweakOne(
    grf: Graph<{ tweak: null }>,
    res: LayoutResult,
  ): LayoutResult {
    grf.nnodes();
    return res;
  }

  function tweakTwo(
    grf: Graph<unknown, null>,
    res: LayoutResult,
  ): LayoutResult {
    grf.nnodes();
    return res;
  }

  const init = zherebko() satisfies Zhere<unknown, unknown>;

  const ranked = init.rank(rank) satisfies Zhere<{ rank: number }, unknown>;
  // @ts-expect-error old data
  ranked satisfies Zhere<unknown, unknown>;

  const sized = ranked.nodeSize(size);
  sized satisfies Zhere<{ rank: number; size: number }, unknown>;
  // @ts-expect-error old data
  sized satisfies Zhere<{ rank: number }, unknown>;

  const layout = sized.tweaks([tweakOne, tweakTwo]);
  layout satisfies Zhere<{ rank: number; size: number; tweak: null }, null>;
  // @ts-expect-error old data
  layout satisfies Zhere<{ rank: number; size: number }, unknown>;

  const [first, second] = layout.tweaks();
  expect(first satisfies typeof tweakOne).toBe(tweakOne);
  expect(second satisfies typeof tweakTwo).toBe(tweakTwo);
  expect(layout.rank() satisfies typeof rank).toBe(rank);
  expect(layout.nodeSize() satisfies typeof size).toBe(size);
});

test("zherebko() works for a point", () => {
  const grf = single();
  const tweak = tweakSize({ width: 2, height: 4 });
  const layout = zherebko().nodeSize([1, 2]).gap([3, 4]).tweaks([tweak]);
  expect(layout.nodeSize()).toEqual([1, 2]);
  expect(layout.gap()).toEqual([3, 4]);
  expect(layout.tweaks()).toEqual([tweak]);
  const { width, height } = layout(grf);
  expect(width).toEqual(2);
  expect(height).toEqual(4);
  const [node] = grf.nodes();
  expect(node.x).toBeCloseTo(1);
  expect(node.y).toBeCloseTo(2);
});

test("zherebko() works for a line", () => {
  const grf = line();
  const layout = zherebko();
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(1);
  expect(height).toBeCloseTo(3);
  const [head, tail] = grf.topological();
  expect(head.x).toBeCloseTo(0.5);
  expect(head.y).toBeCloseTo(0.5);
  expect(tail.x).toBeCloseTo(0.5);
  expect(tail.y).toBeCloseTo(2.5);
});

test("zherebko() works for a multidag line", () => {
  const create = graphConnect();
  const grf = create([
    ["0", "1"],
    ["0", "1"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(3);
  expect(height).toBeCloseTo(5);

  const [head, tail] = grf.topological();
  expect(head.x).toBeCloseTo(1);
  expect(head.y).toBeCloseTo(1);
  expect(tail.x).toBeCloseTo(1);
  expect(tail.y).toBeCloseTo(4);

  const [small, big] = [...grf.links().map(({ points }) => points)].sort(
    (a, b) => a.length - b.length,
  );
  expect(small).toHaveLength(2);
  expect(big).toHaveLength(3);
  const [, [x, y]] = big;
  expect(x).toBeCloseTo(3);
  expect(y).toBeCloseTo(2.5);
});

test("zherebko() works with cycles", () => {
  const dag = oh();

  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(dag);
  const [root, leaf] = dag.topological();

  // the width and height imply that the dummy nodes got positioned appropriately
  expect(width).toBeCloseTo(3);
  expect(height).toBeCloseTo(5);

  expect(root.x).toBeCloseTo(1);
  expect(leaf.x).toBeCloseTo(1);
  expect([root.y, leaf.y].sort()).toEqual([1, 4]);
});

test("zherebko() works specific case", () => {
  const build = graphConnect();
  const grf = build([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["1", "2"],
    ["2", "3"],
    ["2", "4"],
    ["3", "4"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(14);
  for (const node of grf.nodes()) {
    expect(node.x).toBeCloseTo(2);
    expect(node.y).toBeCloseTo(parseInt(node.data, 10) * 3 + 1);
  }
  const [zero, , two] = grf.topological();

  {
    expect(zero.data).toBe("0");
    const [onel, twol, threel] = [...zero.childLinks()].sort();

    expect(onel.target.data).toBe("1");
    expect(onel.points).toHaveLength(2);

    expect(twol.target.data).toBe("2");
    expect(twol.points).toHaveLength(3);
    const [, [x1, y1]] = twol.points;
    expect(x1).toBeCloseTo(4);
    expect(y1).toBeCloseTo(4);

    expect(threel.target.data).toBe("3");
    expect(threel.points).toHaveLength(4);
    const [, [x2, y2], [x3, y3]] = threel.points;
    expect(x2).toBeCloseTo(0);
    expect(y2).toBeCloseTo(4);
    expect(x3).toBeCloseTo(0);
    expect(y3).toBeCloseTo(7);
  }

  {
    expect(two.data).toBe("2");
    const [threel, fourl] = [...two.childLinks()].sort();

    expect(threel.target.data).toBe("3");
    expect(threel.points).toHaveLength(2);

    expect(fourl.target.data).toBe("4");
    expect(fourl.points).toHaveLength(3);
    const [, [x, y]] = fourl.points;
    expect(x).toBeCloseTo(4);
    expect(y).toBeCloseTo(10);
  }
});

test("zherebko() works for four-clique", () => {
  const build = graphConnect();
  const grf = build([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["1", "2"],
    ["1", "3"],
    ["2", "3"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(11);
  for (const node of grf.nodes()) {
    expect(node.x).toBeCloseTo(2);
    expect(node.y).toBeCloseTo(parseInt(node.data, 10) * 3 + 1);
  }
});

test("zherebko() works for a complex multidag", () => {
  //   0
  //  /|\
  // | 1 |
  //  \|/
  //   2
  const create = graphConnect();
  const grf = create([
    ["0", "1"],
    ["0", "2"],
    ["0", "2"],
    ["1", "2"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(8);

  const [head, middle, tail] = grf.topological();
  expect(head.x).toBeCloseTo(2);
  expect(head.y).toBeCloseTo(1);
  expect(middle.x).toBeCloseTo(2);
  expect(middle.y).toBeCloseTo(4);
  expect(tail.x).toBeCloseTo(2);
  expect(tail.y).toBeCloseTo(7);

  for (const { target, points } of head.childLinks()) {
    if (target === middle) continue;
    const diff = Math.max(...points.map(([x]) => Math.abs(x - 2)));
    expect(diff).toBeCloseTo(2);
  }
});

test("zherebko() works on disconnected dag", () => {
  const grf = doub();
  const layout = zherebko().nodeSize([2, 2]);
  layout(grf);
  expect([...grf.nodes().map((node) => node.y)].sort()).toEqual([1, 4]);
  for (const node of grf.nodes()) {
    expect(node.x).toEqual(1);
  }
});

test("zherebko() works on sink", () => {
  const build = graphConnect();
  const grf = build([
    ["0", "3"],
    ["1", "3"],
    ["2", "3"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(11);
  for (const node of grf.nodes()) {
    expect(node.x).toEqual(2);
    expect(node.data === "3" ? node.y === 10 : node.y < 8).toBe(true);
    const [link] = node.childLinks();
    const points = link?.points ?? [];
    const exes = new Set(points.slice(1, -1).map(([x]) => x));
    expect(exes.size).toBeLessThan(2);
    const [x = 0] = exes;
    expect(x === 0 || x === 4).toBe(true);
  }
});

test("zherebko() works on simple cycle", () => {
  const build = graphConnect();
  const grf = build([
    ["0", "1"],
    ["1", "2"],
    ["2", "0"],
  ]);
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(3);
  expect(height).toBeCloseTo(8);

  for (const node of grf.nodes()) {
    expect(node.x).toEqual(1);
  }

  for (const { source, target, points } of grf.links()) {
    const [[hx, hy], ...rest] = points;
    const [[tx, ty], ...mid] = rest.reverse();
    expect(hx).toBe(source.x);
    expect(hy).toBe(source.y);
    expect(tx).toBe(target.x);
    expect(ty).toBe(target.y);

    const [m] = mid;
    expect(m?.[0] ?? 3).toBe(3);
  }
});

test("zherebko() works on induced multi cycle", () => {
  const grf = oh();
  const layout = zherebko().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(3);
  expect(height).toBeCloseTo(5);

  for (const node of grf.nodes()) {
    expect(node.x).toEqual(1);
  }

  for (const { source, target, points } of grf.links()) {
    const [[hx, hy], ...rest] = points;
    const [[tx, ty], ...mid] = rest.reverse();
    expect(hx).toBe(source.x);
    expect(hy).toBe(source.y);
    expect(tx).toBe(target.x);
    expect(ty).toBe(target.y);

    const [m] = mid;
    expect(m?.[0] ?? 3).toBe(3);
  }
});

test("zherebko() works with inverted edges", () => {
  function rank({ data }: { data: string }): number {
    return parseInt(data, 10);
  }

  const build = graphConnect();
  const grf = build([
    ["0", "1"],
    ["2", "1"],
    ["2", "1"],
  ]);
  const layout = zherebko().nodeSize([2, 2]).rank(rank);
  expect(layout.rank()).toBe(rank);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(3);
  expect(height).toBeCloseTo(8);

  const [single, tail, head] = grf.topological(rank);

  expect(single.x).toBe(1);
  expect(single.y).toBe(1);
  expect(head.x).toBe(1);
  expect(head.y).toBe(7);
  expect(tail.x).toBe(1);
  expect(tail.y).toBe(4);

  for (const { source, target, points } of grf.links()) {
    const [[hx, hy], ...rest] = points;
    const [[tx, ty], ...mid] = rest.reverse();
    expect(hx).toBe(source.x);
    expect(hy).toBe(source.y);
    expect(tx).toBe(target.x);
    expect(ty).toBe(target.y);

    const [m] = mid;
    expect(m?.[0] ?? 3).toBe(3);
  }
});

test("zherebko() keeps reversed link points within bounds", () => {
  const build = graphConnect();
  const grf = build([
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "a"],
  ]);
  const layout = zherebko();
  const { width, height } = layout(grf);

  for (const { points } of grf.links()) {
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(-1e-3);
      expect(x).toBeLessThanOrEqual(width + 1e-3);
      expect(y).toBeGreaterThanOrEqual(-1e-3);
      expect(y).toBeLessThanOrEqual(height + 1e-3);
    }
  }
});

test("zherebko() works with variable node sizes", () => {
  const build = graphConnect();
  const grf = build([
    ["1", "2"],
    ["1", "3"],
    ["2", "3"],
  ]);
  const layout = zherebko().nodeSize(({ data }: GraphNode<string>) => [
    parseInt(data, 10),
    parseInt(data, 10),
  ]);
  const { width, height } = layout(grf);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(8);

  const [head, mid, tail] = grf.topological();

  expect(head.x).toBeCloseTo(1.5);
  expect(head.y).toBeCloseTo(0.5);
  expect(mid.x).toBe(1.5);
  expect(mid.y).toBe(3);
  expect(tail.x).toBe(1.5);
  expect(tail.y).toBe(6.5);

  const [{ points }] = grf.links().filter(({ points }) => points.length > 2);
  expect(points).toHaveLength(4);
  const [, [fx, fy], [sx, sy]] = points;
  expect(fx).toBeCloseTo(4);
  expect(fy).toBeCloseTo(3);
  expect(sx).toBeCloseTo(4);
  expect(sy).toBeCloseTo(4);
});

test("zherebko() throws for negative nodeSize", () => {
  const layout = zherebko();
  expect(() => layout.nodeSize([-1, 0])).toThrow("can't be negative");
});

test("zherebko() throws for negative nodeSize function", () => {
  const layout = zherebko().nodeSize(() => [-1, 0]);
  const grf = single();
  expect(() => layout(grf)).toThrow("can't be negative");
});

test("zherebko() throws for negative gap", () => {
  const layout = zherebko();
  expect(() => layout.gap([-1, 0])).toThrow("must be non-negative");
});

test("zherebko() fails with args", () => {
  // @ts-expect-error no args
  expect(() => zherebko(null)).toThrow("got arguments to zherebko");
});

test("zherebko() nests a node's self loops in their own lanes", () => {
  const dag = graphConnect()([
    ["a", "a"],
    ["a", "a"],
    ["a", "a"],
    ["a", "b"],
    ["a", "c"],
    ["a", "d"],
    ["a", "e"],
    ["b", "b"],
    ["b", "c"],
    ["b", "d"],
    ["b", "e"],
    ["c", "d"],
    ["c", "e"],
    ["d", "d"],
    ["d", "e"],
    ["b", "c"],
  ]);
  for (const [[nodeWidth, nodeHeight], [xgap, ygap]] of [
    [
      [1, 1],
      [1, 1],
    ],
    [
      [2, 1],
      [1, 2],
    ],
    [
      [0, 0],
      [2, 1],
    ],
  ] as const) {
    zherebko().nodeSize([nodeWidth, nodeHeight]).gap([xgap, ygap])(dag);
    const lanes = new Map<unknown, [number, number][]>();
    for (const { source, target, points } of dag.links()) {
      if (source === target) {
        const [start, lower, upper, end] = points;
        expect(points).toHaveLength(4);
        expect(start).toEqual([source.x, source.y]);
        expect(end).toEqual([source.x, source.y]);
        // out below the center, up the lane, back in above
        expect(lower[0]).toBeCloseTo(upper[0]);
        expect(lower[1]).toBeGreaterThan(source.y);
        expect(upper[1]).toBeLessThan(source.y);
        const rise = lower[1] - source.y;
        expect(source.y - upper[1]).toBeCloseTo(rise);
        const nodeLanes = lanes.get(source) ?? [];
        nodeLanes.push([lower[0] - source.x, rise]);
        lanes.set(source, nodeLanes);
      }
    }
    // a loop further out on the same side must climb more steeply, or its
    // diagonal crosses the inner loop's lane
    for (const nodeLanes of lanes.values()) {
      for (const side of [1, -1]) {
        const slopes = nodeLanes
          .filter(([dist]) => dist * side > 0)
          .sort(([first], [second]) => Math.abs(first) - Math.abs(second))
          .map(([dist, rise]) => rise / Math.abs(dist));
        for (const [inner, outer] of bigrams(slopes)) {
          expect(outer).toBeGreaterThan(inner);
        }
      }
    }
    // lanes give a node's loops the same places sugiyama and grid draw them
    for (const node of dag.nodes()) {
      const drawn = [
        ...node.childLinksTo(node).map(({ points }) => [...points]),
      ];
      drawLoops(node, [nodeWidth, nodeHeight], xgap, ygap);
      for (const [ind, { points }] of [...node.childLinksTo(node)].entries()) {
        for (const [pointInd, [pointX, pointY]] of points.entries()) {
          const [drawnX, drawnY] = drawn[ind][pointInd];
          expect(drawnX).toBeCloseTo(pointX);
          expect(drawnY).toBeCloseTo(pointY);
        }
      }
    }
  }
});

test("zherebko() keeps self loops on neighboring nodes apart", () => {
  const dag = graphConnect()([
    ["a", "b"],
    ["b", "c"],
    ["a", "a"],
    ["a", "a"],
    ["a", "a"],
    ["b", "b"],
    ["b", "b"],
    ["c", "c"],
  ]);
  for (const layout of [zherebko(), zherebko().nodeSize([0, 0]).gap([1, 1])]) {
    layout(dag);
    expect(loopCrossings(dag)).toBe(0);
  }
});

test("zherebko() fits a self loop on a single node", () => {
  const dag = graphConnect()([["a", "a"]]);
  const { width, height } = zherebko().nodeSize([1, 1]).gap([1, 2])(dag);
  expect(width).toBeCloseTo(2);
  expect(height).toBeCloseTo(2);
  const [loop] = dag.links();
  const [[startX, startY], [lowerX, lowerY], [upperX, upperY], end] =
    loop.points;
  expect([startX, startY]).toEqual(end);
  expect(startX).toBeCloseTo(0.5);
  expect(startY).toBeCloseTo(1);
  expect(lowerX).toBeCloseTo(2);
  expect(upperX).toBeCloseTo(2);
  expect(lowerY).toBeCloseTo(2);
  expect(upperY).toBeCloseTo(0);
});

test("zherebko() reuses inner lanes a link passed over beside loops", () => {
  const dag = graphConnect()([
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["f", "g"],
    ["b", "b"],
    ["b", "b"],
    ["b", "b"],
    ["b", "b"],
    ["a", "c"],
    ["c", "e"],
    ["c", "f"],
    ["c", "g"],
  ]);
  zherebko()(dag);
  const laneXs = new Map(
    dag
      .links()
      .filter(({ source }) => source.data === "c")
      .map(({ target, points: [, [laneX]] }) => [target.data, laneX]),
  );
  // a -> c had to pass b's loops in right lane 3, but right lanes 1 and 2 are
  // free below b
  expect(laneXs.get("e")).toBeCloseTo(4);
  expect(laneXs.get("f")).toBeCloseTo(1);
  expect(laneXs.get("g")).toBeCloseTo(5);
});

for (const dat of [
  single,
  doub,
  line,
  oh,
  trip,
  multi,
  eye,
  square,
  dummy,
  three,
  en,
  ex,
  ccoz,
  zhere,
  loop,
  loops,
]) {
  test(`zherebko() keeps ${dat.name} inside its bounds`, () => {
    const grf = dat();
    const layout = zherebko().nodeSize([2, 1]).gap([1, 2]);
    const { width, height } = layout(grf);
    for (const node of grf.nodes()) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(height);
    }
    for (const { source, target, points } of grf.links()) {
      if (source === target) expect(points).toHaveLength(4);
      expect(points.length).toBeGreaterThanOrEqual(2);
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(-1e-6);
        expect(x).toBeLessThanOrEqual(width + 1e-6);
        expect(y).toBeGreaterThanOrEqual(-1e-6);
        expect(y).toBeLessThanOrEqual(height + 1e-6);
      }
    }
  });
}
