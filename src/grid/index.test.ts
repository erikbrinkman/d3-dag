import { expect, test } from "bun:test";
import { graphConnect } from "../graph/connect.js";
import { type Graph, type GraphNode, graph } from "../graph/index.js";
import type { LayoutResult } from "../layout.js";
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
import { grid } from "./index.js";
import { laneGreedy } from "./lane/greedy.js";

type Grid<N, L> = (inp: Graph<N, L>) => LayoutResult;

test("grid() works for empty graph", () => {
  const grf = graph();
  const layout = grid();
  const { width, height } = layout(grf);
  expect(width).toEqual(0);
  expect(height).toEqual(0);
});

test("greedy() works for triangle", () => {
  const grf = dummy();
  const tweak = tweakSize({ width: 10, height: 28 });
  const layout = grid().nodeSize([1, 2]).gap([3, 4]).tweaks([tweak]);
  expect(layout.nodeSize()).toEqual([1, 2]);
  expect(layout.gap()).toEqual([3, 4]);
  expect(layout.tweaks()).toEqual([tweak]);
  const { width, height } = layout(grf);
  expect(width).toEqual(10);
  expect(height).toEqual(28);
  const [head, mid, tail] = grf.topological();
  expect(head.x).toBeCloseTo(1);
  expect(head.y).toBeCloseTo(2);
  expect(mid.x).toBeCloseTo(9);
  expect(mid.y).toBeCloseTo(14);
  expect(tail.x).toBeCloseTo(1);
  expect(tail.y).toBeCloseTo(26);
});

test("greedy() works for zherebko", () => {
  const orig = zhere();
  const lane = laneGreedy().topDown(false);
  const layout = grid().nodeSize([2, 2]).lane(lane);
  expect(layout.lane()).toBe(lane);
  const { width, height } = layout(orig);
  // NOTE flaky depending on implementation
  expect(width).toEqual(14);
  expect(height).toEqual(32);
});

test("greedy() works for cycle", () => {
  const grf = oh();
  const layout = grid().nodeSize([2, 2] as const);
  expect(layout.nodeSize()).toEqual([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toEqual(2);
  expect(height).toEqual(5);
  for (const { source, target, points } of grf.links()) {
    const [[sx, sy], [tx, ty]] = points;
    expect(sx).toBe(source.x);
    expect(sy).toBe(source.y);
    expect(tx).toBe(target.x);
    expect(ty).toBe(target.y);
  }
});

test("grid() works with custom rank", () => {
  function rank({ data }: { data: string }): number | undefined {
    if (data === "1") {
      return 2;
    } else if (data === "2") {
      return 1;
    } else {
      return undefined;
    }
  }

  const orig = en();
  const layout = grid().nodeSize([2, 2]).rank(rank);

  expect(layout.rank()).toBe(rank);
  const { width, height } = layout(orig);
  expect(width).toEqual(5);
  expect(height).toEqual(11);
});

test("grid() allows setting custom operators", () => {
  function rank({ data }: { data: { rank: number } }): number | undefined {
    return data.rank;
  }

  function size({ data }: { data: { size: number } }): [number, number] {
    return [data.size, data.size];
  }

  function lane(ordered: readonly GraphNode<unknown, { lane: number }>[]) {
    for (const [i, node] of ordered.entries()) {
      node.x = i;
    }
  }

  function tweakOne(
    grf: Graph<{ tweak: null }>,
    res: LayoutResult,
  ): LayoutResult {
    grf.nnodes();
    return res;
  }

  function tweakTwo(
    grf: Graph<unknown, { tweak: null }>,
    res: LayoutResult,
  ): LayoutResult {
    grf.nnodes();
    return res;
  }

  const init = grid() satisfies Grid<unknown, unknown>;

  const ranked = init.rank(rank) satisfies Grid<{ rank: number }, unknown>;
  // @ts-expect-error old data
  ranked satisfies Grid<unknown, unknown>;

  const sized = ranked.nodeSize(size);
  sized satisfies Grid<{ rank: number; size: number }, unknown>;
  // @ts-expect-error old data
  sized satisfies Grid<{ rank: number }, unknown>;

  const laned = sized.lane(lane);
  laned satisfies Grid<{ rank: number; size: number }, { lane: number }>;
  // @ts-expect-error old data
  laned satisfies Grid<{ rank: number; size: number }, unknown>;

  const layout = laned.tweaks([tweakOne, tweakTwo]);
  layout satisfies Grid<
    { rank: number; size: number; tweak: null },
    { lane: number; tweak: null }
  >;
  // @ts-expect-error old data
  layout satisfies Grid<{ rank: number; size: number }, { lane: number }>;

  const [first, second] = layout.tweaks();
  expect(first satisfies typeof tweakOne).toBe(tweakOne);
  expect(second satisfies typeof tweakTwo).toBe(tweakTwo);
  expect(layout.rank() satisfies typeof rank).toBe(rank);
  expect(layout.nodeSize() satisfies typeof size).toBe(size);
  expect(layout.lane() satisfies typeof lane).toBe(lane);
});

test("grid() works for multigraph", () => {
  const grf = multi();
  const layout = grid().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toEqual(2);
  expect(height).toEqual(5);
  const [head, tail] = grf.topological();
  expect(head.x).toEqual(1);
  expect(head.y).toEqual(1);
  expect(tail.x).toEqual(1);
  expect(tail.y).toEqual(4);
  for (const { points } of head.childLinks()) {
    expect(points).toEqual([
      [1, 1],
      [1, 4],
    ]);
  }
});

test("grid() works for cycles", () => {
  const grf = oh();
  const layout = grid().nodeSize([2, 2]);
  const { width, height } = layout(grf);
  expect(width).toEqual(2);
  expect(height).toEqual(5);
  const [head, tail] = grf.topological();

  // NOTE brittle: could flip
  expect(head.x).toEqual(1);
  expect(head.y).toEqual(1);
  expect(tail.x).toEqual(1);
  expect(tail.y).toEqual(4);

  for (const { points } of head.childLinks()) {
    expect(points).toEqual([
      [1, 1],
      [1, 4],
    ]);
  }
  for (const { points } of head.parentLinks()) {
    expect(points).toEqual([
      [1, 4],
      [1, 1],
    ]);
  }
});

test("grid() handles inverted long edges correctly", () => {
  function rank({ data }: { data: string }): number {
    return data === "2" ? 0 : data === "0" ? 1 : 2;
  }

  const grf = dummy();
  const layout = grid().nodeSize([2, 2]).rank(rank);
  const { width, height } = layout(grf);
  expect(width).toEqual(5);
  expect(height).toEqual(8);
  const [head, mid, tail] = grf.topological(rank);

  expect(head.x).toEqual(1);
  expect(head.y).toEqual(1);
  expect(mid.x).toEqual(4);
  expect(mid.y).toEqual(4);
  expect(tail.x).toEqual(1);
  expect(tail.y).toEqual(7);

  const [one] = tail.childLinks();
  expect(one.points).toEqual([
    [1, 7],
    [1, 1],
  ]);

  const [two] = tail.parentLinks();
  expect(two.points).toEqual([
    [4, 4],
    [1, 4],
    [1, 7],
  ]);

  const [three] = Iterator.from(head.parentLinks()).filter(
    (link) => link !== one,
  );
  expect(three.points).toEqual([
    [4, 4],
    [4, 1],
    [1, 1],
  ]);
});

test("grid() throws for invalid lane operators", () => {
  const orig = dummy();

  const missing = grid().lane(() => undefined);
  expect(() => missing(orig)).toThrow("didn't assign an x");

  function negOp(ordered: readonly GraphNode[]) {
    for (const node of ordered) {
      node.x = -1;
    }
  }
  const neg = grid().lane(negOp);
  expect(() => neg(orig)).toThrow(
    "custom lane 'negOp' assigned an x less than 0: -1",
  );

  function skipOp(ordered: readonly GraphNode[]) {
    for (const [i, node] of ordered.entries()) {
      node.x = (i % 2) * 2;
    }
  }
  const skip = grid().lane(skipOp);
  expect(() => skip(orig)).toThrow("didn't assign increasing");

  function invalidOp(ordered: readonly GraphNode[]) {
    for (const node of ordered) {
      node.x = 0;
    }
  }
  const invalid = grid().lane(invalidOp);
  expect(() => invalid(orig)).toThrow(
    "custom lane 'invalidOp' assigned nodes to an overlapping lane: 0",
  );
});

test("greedy() works for variable sizes", () => {
  const grf = dummy();
  const layout = grid().nodeSize(({ data }: GraphNode<string>) => [
    parseInt(data, 10) + 1,
    parseInt(data, 10) + 1,
  ]);
  const { width, height } = layout(grf);
  expect(width).toEqual(6);
  expect(height).toEqual(8);
  const [head, mid, tail] = grf.topological();
  expect(head.x).toBeCloseTo(1.5);
  expect(head.y).toBeCloseTo(0.5);
  expect(mid.x).toBeCloseTo(5);
  expect(mid.y).toBeCloseTo(3);
  expect(tail.x).toBeCloseTo(1.5);
  expect(tail.y).toBeCloseTo(6.5);
});

test("grid() throws invalid nodeSize", () => {
  expect(() => grid().nodeSize([-1, 1])).toThrow("can't be negative");
});

test("grid() throws invalid callable nodeSize", () => {
  const layout = grid().nodeSize(() => [-1, 1]);
  const grf = single();
  expect(() => layout(grf)).toThrow("can't be negative");
});

test("grid() throws invalid gap", () => {
  expect(() => grid().gap([0, -1])).toThrow("must be non-negative");
});

test("grid() throws for arguments", () => {
  // @ts-expect-error no args
  expect(() => grid(null)).toThrow("grid");
});

test("grid() draws self loops beside their node", () => {
  const dag = graphConnect()([
    ["a", "a"],
    ["a", "a"],
    ["a", "b"],
    ["a", "c"],
    ["b", "d"],
    ["c", "c"],
    ["c", "d"],
    ["c", "e"],
    ["d", "d"],
    ["e", "e"],
  ]);
  for (const layout of [
    grid(),
    grid().nodeSize([2, 1]).gap([1, 2]),
    grid().nodeSize(({ data }: { data: string }) =>
      data === "c" ? [3, 2] : [1, 1],
    ),
  ]) {
    const { width, height } = layout(dag);
    for (const { points } of dag.links()) {
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
    for (const { source, target, points } of dag.links()) {
      if (source === target) {
        const [start, lower, upper, end] = points;
        expect(points).toHaveLength(4);
        expect(start).toEqual([source.x, source.y]);
        expect(end).toEqual([source.x, source.y]);
        expect(lower[0]).toBeCloseTo(upper[0]);
        expect(lower[1]).toBeGreaterThan(source.y);
        expect(upper[1]).toBeLessThan(source.y);
      }
    }
    expect(loopCrossings(dag)).toBe(0);
  }
});

test("grid() puts self loops on the side fewer links leave from", () => {
  const dag = graphConnect()([
    ["a", "c"],
    ["b", "c"],
    ["a", "a"],
    ["b", "b"],
  ]);
  const { width, height } = grid().nodeSize([1, 1]).gap([1, 1])(dag);
  expect(width).toBeCloseTo(4);
  expect(height).toBeCloseTo(5.25);
  const [bNode, aNode, cNode] = dag.topological();
  expect([aNode.data, bNode.data, cNode.data]).toEqual(["a", "b", "c"]);
  // a's link to c leaves to the left, so its loop goes right
  expect(cNode.x).toBeLessThan(aNode.x);
  const [aLoop] = aNode.childLinksTo(aNode);
  expect(aLoop.points[1][0]).toBeCloseTo(aNode.x + 1);
  const [bLoop] = bNode.childLinksTo(bNode);
  expect(bLoop.points[1][0]).toBeCloseTo(bNode.x + 1);
  expect(loopCrossings(dag)).toBe(0);
});

test("grid() counts links back up from below when placing self loops", () => {
  const lanes: Record<string, number> = { a: 1, b: 0, c: 2, d: 2 };
  const order = ["a", "b", "c", "d"];
  const dag = graphConnect()([
    ["a", "b"],
    ["c", "a"],
    ["d", "a"],
    ["a", "a"],
  ]);
  grid()
    .rank(({ data }: GraphNode<string>) => order.indexOf(data))
    .lane((ordered: readonly GraphNode<string>[]) => {
      for (const node of ordered) node.x = lanes[node.data];
    })
    .nodeSize([1, 1])
    .gap([1, 1])(dag);
  const [aNode] = [...dag.nodes()].filter(({ data }) => data === "a");
  // one link leaves left, but two links up from below arrive from the right
  const [loop] = aNode.childLinksTo(aNode);
  expect(loop.points[1][0]).toBeLessThan(aNode.x);
});

test("grid() makes room for a self loop on a single node", () => {
  const dag = graphConnect()([["a", "a"]]);
  const { width, height } = grid().nodeSize([1, 1]).gap([1, 1])(dag);
  expect(width).toBeCloseTo(1.5);
  expect(height).toBeCloseTo(1.5);
  const [loop] = dag.links();
  const [[startX, startY], [lowerX, lowerY], [upperX, upperY], end] =
    loop.points;
  expect([startX, startY]).toEqual(end);
  expect(startX).toBeCloseTo(0.5);
  expect(startY).toBeCloseTo(0.75);
  expect(lowerX).toBeCloseTo(1.5);
  expect(upperX).toBeCloseTo(1.5);
  expect(lowerY).toBeCloseTo(1.5);
  expect(upperY).toBeCloseTo(0);
});

test("grid() puts tied self loops on the right", () => {
  const dag = graphConnect()([
    ["a", "a"],
    ["a", "a"],
    ["a", "a"],
  ]);
  const { width } = grid().nodeSize([1, 1]).gap([1, 1])(dag);
  expect(width).toBeCloseTo(2.5);
  const [node] = dag.nodes();
  expect(node.x).toBeCloseTo(0.5);
  const loopXs = [...dag.links()].map(({ points }) => points[1][0]);
  expect(loopXs[0]).toBeCloseTo(1.5);
  expect(loopXs[1]).toBeCloseTo(2);
  expect(loopXs[2]).toBeCloseTo(2.5);
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
  test(`grid() keeps ${dat.name} inside its bounds`, () => {
    const grf = dat();
    const layout = grid().nodeSize([2, 1]).gap([1, 2]);
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
