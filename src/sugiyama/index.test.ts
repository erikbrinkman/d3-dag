import { expect, test } from "bun:test";
import { graphConnect } from "../graph/connect.js";
import { type Graph, type GraphNode, graph } from "../graph/index.js";
import type { LayoutResult, NodeSize } from "../layout.js";
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
import { type Tweak, tweakSize } from "../tweaks.js";
import { coordCenter } from "./coord/center.js";
import { coordGreedy } from "./coord/greedy.js";
import type { Coord } from "./coord/index.js";
import { coordQuad } from "./coord/quad.js";
import { coordSimplex } from "./coord/simplex.js";
import { coordTopological } from "./coord/topological.js";
import { decrossDfs } from "./decross/dfs.js";
import type { Decross } from "./decross/index.js";
import { decrossOpt } from "./decross/opt.js";
import { decrossTwoLayer } from "./decross/two-layer.js";
import { sugiyama } from "./index.js";
import type { Layering } from "./layering/index.js";
import { layeringTopological } from "./layering/topological.js";
import type { SugiNode, SugiSeparation } from "./sugify.js";
import { canonical } from "./test-utils.js";

type Sugiyama<N, L> = (inp: Graph<N, L>) => LayoutResult;

test("sugiyama() works on empty graph", () => {
  const dag = graph<undefined, undefined>();
  const layout = sugiyama();
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(0);
  expect(height).toBeCloseTo(0);
});

test("sugiyama() works for single node", () => {
  const dag = single();
  const layout = sugiyama();
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(1);
  expect(height).toBeCloseTo(1);

  const [node] = dag.nodes();
  expect(node.x).toBeCloseTo(0.5);
  expect(node.y).toBeCloseTo(0.5);
});

test("sugiyama() works for double node vertically", () => {
  const dag = doub();
  const layout = sugiyama().layering(layeringTopological());
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(1);
  expect(height).toBeCloseTo(3);

  const [first, second] = dag.topological();
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(2.5);
});

test("sugiyama() works for triple node horizontally", () => {
  const dag = trip();
  const layout = sugiyama();
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(5);
  expect(height).toBeCloseTo(1);

  const [first, second, third] = dag.topological();
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(2.5);
  expect(second.y).toBeCloseTo(0.5);
  expect(third.x).toBeCloseTo(4.5);
  expect(third.y).toBeCloseTo(0.5);
});

test("sugiyama() works for triple node horizontally sized", () => {
  const dag = trip();
  const layout = sugiyama().nodeSize(() => [2, 2]);
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(8);
  expect(height).toBeCloseTo(2);

  const [first, second, third] = dag.topological();
  expect(first.x).toBeCloseTo(1);
  expect(first.y).toBeCloseTo(1);
  expect(second.x).toBeCloseTo(4);
  expect(second.y).toBeCloseTo(1);
  expect(third.x).toBeCloseTo(7);
  expect(third.y).toBeCloseTo(1);
});

test("sugiyama() works with a dummy node", () => {
  const dag = dummy();
  const layout = sugiyama();
  const { width, height } = layout(dag);
  const [first, second, third] = canonical(dag);

  expect(width).toBeCloseTo(2.5);
  expect(height).toBeCloseTo(5);

  expect(first.y).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(2.5);
  expect(third.y).toBeCloseTo(4.5);

  // NOTE these x's could flip, so this is brittle
  expect(first.x).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(2.0);
  expect(third.x).toBeCloseTo(0.5);
});

test("sugiyama() works with a multi dag", () => {
  const dag = multi();

  const layout = sugiyama().nodeSize([2, 2]).gap([1, 1]);
  const { width, height } = layout(dag);
  const [root, leaf] = dag.topological();

  // the width and height imply that the dummy nodes got positioned appropriately
  expect(width).toBeCloseTo(2);
  expect(height).toBeCloseTo(5);

  // NOTE either could be one or two, so this is brittle
  expect(root.x).toBeCloseTo(1);
  expect(root.y).toBeCloseTo(1);

  expect(leaf.x).toBeCloseTo(1);
  expect(leaf.y).toBeCloseTo(4);

  const xes = [];
  for (const { points } of dag.links()) {
    const [[x1, y1], [xc, yc], [x2, y2]] = points;
    expect(x1).toBeCloseTo(1);
    expect(y1).toBeCloseTo(1);
    expect(yc).toBeCloseTo(2.5);
    expect(x2).toBeCloseTo(1);
    expect(y2).toBeCloseTo(4);

    xes.push(xc);
  }
  const [x1, x2] = xes;
  expect(Math.abs(x1 - x2)).toBeGreaterThanOrEqual(1);
});

test("sugiyama() works with cycles", () => {
  const dag = oh();

  const layout = sugiyama()
    .nodeSize(() => [2, 2])
    .gap([1, 1]);
  const { width, height } = layout(dag);
  const [root, leaf] = dag.topological();

  // the width and height imply that the dummy nodes got positioned appropriately
  expect(width).toBeCloseTo(2);
  expect(height).toBeCloseTo(5);

  // NOTE either could be one or two, so this is brittle
  expect(root.x).toBeCloseTo(1);
  expect(leaf.x).toBeCloseTo(1);
  expect([root.y, leaf.y].sort()).toEqual([1, 4]);
});

test("sugiyama() draws self loops beside their node", () => {
  const dag = graphConnect()([
    ["a", "a"],
    ["a", "a"],
    ["a", "a"],
    ["a", "b"],
    ["b", "b"],
  ]);
  const layouts = [
    ...[decrossTwoLayer(), decrossDfs(), decrossOpt()].flatMap((decross) =>
      [coordSimplex(), coordQuad(), coordCenter(), coordGreedy()].map((coord) =>
        sugiyama().decross(decross).coord(coord).nodeSize([2, 2]).gap([2, 2]),
      ),
    ),
    sugiyama()
      .layering(layeringTopological())
      .coord(coordTopological())
      .nodeSize([2, 2])
      .gap([2, 2]),
  ];
  for (const layout of layouts) {
    const { width, height } = layout(dag);
    // a needs room for two loops on its right and one on its left
    expect(width).toBeCloseTo(5);
    for (const { points } of dag.links()) {
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
    }

    const [aNode] = dag.topological();
    const loops = [
      ...aNode.childLinksTo(aNode).map(({ points }) => {
        const [start, lower, upper, end] = points;
        expect(points).toHaveLength(4);
        expect(start).toEqual([aNode.x, aNode.y]);
        expect(end).toEqual([aNode.x, aNode.y]);
        // out below the center, back in above
        expect(lower[0]).toBeCloseTo(upper[0]);
        expect(lower[1]).toBeGreaterThan(aNode.y);
        expect(upper[1]).toBeLessThan(aNode.y);
        return [lower[0] - aNode.x, lower[1] - aNode.y] as const;
      }),
    ];
    const [[firstX], [secondX], [thirdX, thirdY]] = loops;
    expect(firstX).toBeCloseTo(2);
    expect(secondX).toBeCloseTo(-2);
    expect(thirdX).toBeCloseTo(3);
    // the outer loop rises more for its distance, so it stays outside
    expect(thirdY / thirdX).toBeGreaterThan(loops[0][1] / firstX);
  }
});

test("sugiyama() allows changing nodeSize and gap", () => {
  const dag = three();

  function nodeSize(node: GraphNode<string>): [number, number] {
    const size = parseInt(node.data, 10) + 1;
    return [size, size];
  }

  const tweak = tweakSize({ width: 26, height: 28 });
  const layout = sugiyama().nodeSize(nodeSize).gap([2, 2]).tweaks([tweak]);
  expect(layout.nodeSize()).toBe(nodeSize);
  expect(layout.gap()).toEqual([2, 2]);
  expect(layout.tweaks()).toEqual([tweak]);
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(26);
  expect(height).toBeCloseTo(28);
  const [head, ...rest] = canonical(dag);
  const [tail, ...mids] = rest.reverse();

  for (const node of mids) {
    expect(node.x).toBeGreaterThanOrEqual(2);
    expect(node.x).toBeLessThanOrEqual(24);
  }

  expect(head.y).toBeCloseTo(1);
  for (const mid of mids) {
    expect(mid.y).toBeCloseTo(10);
  }
  expect(tail.y).toBeCloseTo(23);
});

test("sugiyama() allows changing operators", () => {
  const dag = dummy();
  const layering: Layering<string, unknown> = <N extends string, L>(
    dag: Graph<N, L>,
  ): number => {
    const ordered = canonical(dag);
    for (const [i, node] of ordered.entries()) {
      node.y = i;
    }
    return dag.nnodes() - 1;
  };
  const decross: Decross<string | number | boolean, unknown> = () => undefined;
  const coord: Coord<string | number, unknown> = <N extends string | number, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>,
  ): number => {
    let width = 0;
    for (const layer of layers) {
      let x = 0;
      let last: SugiNode<N, L> | undefined;
      for (const node of layer) {
        node.x = x += sep(last, node);
        last = node;
      }
      width = Math.max(width, x + sep(last, undefined));
    }
    return width;
  };
  const nodeSize: NodeSize<unknown, { 0: string }> = () => [1, 2];
  const tweak: Tweak<unknown, { 1: string }> = (_, res) => res;

  const init = sugiyama().gap([2, 2]) satisfies Sugiyama<unknown, unknown>;
  const decrossed = init.decross(decross);
  decrossed satisfies Sugiyama<string | number | boolean, unknown>;
  // @ts-expect-error invalid data
  decrossed satisfies sugiyama<unknown, unknown>;
  const coorded = decrossed.coord(coord);
  coorded satisfies Sugiyama<string | number, unknown>;
  // @ts-expect-error invalid data
  coorded satisfies Sugiyama<string | number | boolean, unknown>;
  const layered = coorded.layering(layering);
  layered satisfies Sugiyama<string, unknown>;
  // @ts-expect-error invalid data
  layered satisfies Sugiyama<string | number, unknown>;
  const sized = layered.nodeSize(nodeSize) satisfies Sugiyama<string, [string]>;
  // @ts-expect-error invalid data
  sized satisfies Sugiyama<string, unknown>;
  const layout = sized.tweaks([tweak]);
  layout satisfies Sugiyama<string, [string, string]>;
  // @ts-expect-error invalid data
  layout satisfies Sugiyama<string, [string]>;

  const [first] = layout.tweaks();
  expect(first satisfies typeof tweak).toBe(tweak);
  expect(layout.layering() satisfies typeof layering).toBe(layering);
  expect(layout.decross() satisfies typeof decross).toBe(decross);
  expect(layout.coord() satisfies typeof coord).toBe(coord);
  expect(layout.nodeSize() satisfies typeof nodeSize).toBe(nodeSize);
  // still runs
  layout(dag);
});

const noop = (): number => 1;

test("sugiyama() throws with noop layering", () => {
  const dag = dummy();
  const layout = sugiyama().layering(noop);
  expect(() => layout(dag)).toThrow(
    "custom layering 'noop' didn't assign a layer to a node",
  );
});

test("sugiyama() throws with invalid layers", () => {
  // layers are weird
  const dag = single();

  function layering<N, L>(dag: Graph<N, L>): number {
    for (const node of dag.nodes()) {
      node.y = -1;
    }
    return 1;
  }

  const layout = sugiyama().layering(layering);
  expect(() => layout(dag)).toThrow(
    `custom layering 'layering' assigned node an invalid layer: -1`,
  );
});

test("sugiyama() throws with flat layering", () => {
  // layers are weird
  const dag = dummy();

  function layering<N, L>(dag: Graph<N, L>): number {
    for (const node of dag.nodes()) {
      node.y = 0;
    }
    return 1;
  }

  const layout = sugiyama().layering(layering);
  expect(() => layout(dag)).toThrow(
    "custom layering 'layering' assigned nodes with an edge to the same layer",
  );
});

test("sugiyama() throws with noop coord", () => {
  const dag = dummy();
  const coord: Coord<unknown, unknown> = () => 1;
  const layout = sugiyama().coord(coord);
  expect(() => layout(dag)).toThrow(
    "custom coord 'coord' didn't assign an x to every node",
  );
});

test("sugiyama() throws with large coord width", () => {
  const dag = dummy();
  const layout = sugiyama().coord((layers: SugiNode[][]): number => {
    for (const layer of layers) {
      for (const node of layer) {
        node.x = 2;
      }
    }
    return 1; // 1 < 2
  });
  expect(() => layout(dag)).toThrow(
    "custom coord 'anonymous' assigned nodes too close for separation",
  );
});

test("sugiyama() throws with negative width", () => {
  const dag = dummy();
  const layout = sugiyama().coord((layers: SugiNode[][]): number => {
    for (const layer of layers) {
      for (const node of layer) {
        node.x = -1;
      }
    }
    return 1;
  });
  expect(() => layout(dag)).toThrow(
    "custom coord 'anonymous' assigned nodes too close for separation",
  );
});

test("sugiyama() throws with negative const node width", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([-1, 1])).toThrow(
    "constant nodeSize can't be negative, but got: [-1, 1]",
  );
});

test("sugiyama() throws with negative const node height", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([1, -1])).toThrow(
    "constant nodeSize can't be negative, but got: [1, -1]",
  );
});

test("sugiyama() throws with NaN node sizes", () => {
  expect(() => sugiyama().nodeSize([Number.NaN, 1])).toThrow(
    "constant nodeSize can't be negative",
  );
  const layout = sugiyama().nodeSize(() => [1, Number.NaN]);
  expect(() => layout(dummy())).toThrow("node sizes can't be negative");
});

test("sugiyama() throws with negative node width", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [-1, 1]);
  expect(() => layout(dag)).toThrow("node sizes can't be negative");
});

test("sugiyama() lays out zero-size nodes", () => {
  const dag = dummy();
  const { width, height } = sugiyama().nodeSize([0, 0])(dag);
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});

test("sugiyama() throws with negative gap width", () => {
  const layout = sugiyama();
  expect(() => layout.gap([-1, 1])).toThrow(
    "gap width (-1) and height (1) must be non-negative",
  );
});

test("sugiyama() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => sugiyama(null)).toThrow("got arguments to sugiyama");
});

const coords: [string, Coord<unknown, unknown>][] = [
  ["coordSimplex", coordSimplex()],
  ["coordQuad", coordQuad()],
];
for (const [name, coord] of coords) {
  test(`sugiyama() with ${name} lays out a multi link from a node with no height`, () => {
    const dag = multi();
    const [root, leaf] = dag.topological();
    const layout = sugiyama()
      .coord(coord)
      .nodeSize((node: GraphNode) => (node === root ? [1, 0] : [1, 1]))
      .gap([10, 0]);
    const { width, height } = layout(dag);

    expect(width).toBeCloseTo(10);
    expect(height).toBeCloseTo(1);
    expect(root.x).toBeCloseTo(5);
    expect(leaf.x).toBeCloseTo(5);
    const middles = [...dag.links().map(({ points: [, [x]] }) => x)].sort(
      (left, right) => left - right,
    );
    expect(middles[0]).toBeCloseTo(0);
    expect(middles[1]).toBeCloseTo(10);
  });
}

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
  test(`sugiyama() keeps ${dat.name} inside its bounds`, () => {
    const grf = dat();
    const layout = sugiyama().nodeSize([2, 1]).gap([1, 2]);
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
