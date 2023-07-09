import { zherebko } from ".";
import { Graph, GraphNode, graph } from "../graph";
import { graphConnect } from "../graph/connect";
import { filter, map } from "../iters";
import { LayoutResult } from "../layout";
import { doub, line, oh, single } from "../test-graphs";
import { tweakSize } from "../tweaks";

interface Zhere<N, L> {
  (inp: Graph<N, L>): LayoutResult;
}

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

  const [small, big] = [...map(grf.links(), ({ points }) => points)].sort(
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
    expect(node.y).toBeCloseTo(parseInt(node.data) * 3 + 1);
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
    expect(node.y).toBeCloseTo(parseInt(node.data) * 3 + 1);
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
  expect([...map(grf.nodes(), (node) => node.y)].sort()).toEqual([1, 4]);
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
    return parseInt(data);
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

test("zherebko() works with variable node sizes", () => {
  const build = graphConnect();
  const grf = build([
    ["1", "2"],
    ["1", "3"],
    ["2", "3"],
  ]);
  const layout = zherebko().nodeSize(({ data }: GraphNode<string>) => [
    parseInt(data),
    parseInt(data),
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

  const [{ points }] = filter(grf.links(), ({ points }) => points.length > 2);
  expect(points).toHaveLength(4);
  const [, [fx, fy], [sx, sy]] = points;
  expect(fx).toBeCloseTo(4);
  expect(fy).toBeCloseTo(3);
  expect(sx).toBeCloseTo(4);
  expect(sy).toBeCloseTo(4);
});

test("zherebko() throws for negative nodeSize", () => {
  const layout = zherebko();
  expect(() => layout.nodeSize([-1, 0])).toThrow("must be positive");
});

test("zherebko() throws for negative nodeSize function", () => {
  const layout = zherebko().nodeSize(() => [-1, 0]);
  const grf = single();
  expect(() => layout(grf)).toThrow("must be positive");
});

test("zherebko() throws for negative gap", () => {
  const layout = zherebko();
  expect(() => layout.gap([-1, 0])).toThrow("must be non-negative");
});

test("zherebko() fails with args", () => {
  // @ts-expect-error no args
  expect(() => zherebko(null)).toThrow("got arguments to zherebko");
});
