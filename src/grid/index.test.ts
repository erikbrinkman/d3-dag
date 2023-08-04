import { grid } from ".";
import { Graph, graph, GraphNode } from "../graph";
import { filter } from "../iters";
import { LayoutResult } from "../layout";
import { cyc, dummy, en, multi, oh, single, zhere } from "../test-graphs";
import { tweakSize } from "../tweaks";
import { laneGreedy } from "./lane/greedy";

interface Grid<N, L> {
  (inp: Graph<N, L>): LayoutResult;
}

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
  const grf = cyc();
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

  const layout = laned.tweaks([tweakOne, tweakTwo] as const);
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

  const [three] = filter(head.parentLinks(), (link) => link !== one);
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
    parseInt(data) + 1,
    parseInt(data) + 1,
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
  expect(() => grid().nodeSize([0, 1])).toThrow("must be positive");
});

test("grid() throws invalid callable nodeSize", () => {
  const layout = grid().nodeSize(() => [0, 1]);
  const grf = single();
  expect(() => layout(grf)).toThrow("must be positive");
});

test("grid() throws invalid gap", () => {
  expect(() => grid().gap([0, -1])).toThrow("must be non-negative");
});

test("grid() throws for arguments", () => {
  // @ts-expect-error no args
  expect(() => grid(null)).toThrow("grid");
});
