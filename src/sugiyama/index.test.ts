import { sugiyama } from ".";
import { Graph, graph, GraphNode } from "../graph";
import { LayoutResult, NodeSize } from "../layout";
import { doub, dummy, multi, oh, single, three, trip } from "../test-graphs";
import { Tweak, tweakSize } from "../tweaks";
import { Coord } from "./coord";
import { Decross } from "./decross";
import { Layering } from "./layering";
import { layeringTopological } from "./layering/topological";
import { SugiNode } from "./sugify";
import { canonical } from "./test-utils";

interface Sugiyama<N, L> {
  (inp: Graph<N, L>): LayoutResult;
}

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

test("sugiyama() allows changing nodeSize and gap", () => {
  const dag = three();

  function nodeSize(node: GraphNode<string>): [number, number] {
    const size = parseInt(node.data) + 1;
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
  const coord: Coord<string | number, unknown> = (layers, sep): number => {
    let width = 0;
    for (const layer of layers) {
      let x = 0;
      let last = undefined;
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

test("sugiyama() throws with non-positive const node width", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([0, 1])).toThrow(
    "constant nodeSize must be positive, but got: [0, 1]",
  );
});

test("sugiyama() throws with non-positive const node height", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([1, 0])).toThrow(
    "constant nodeSize must be positive, but got: [1, 0]",
  );
});

test("sugiyama() throws with zero node width", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [0, 1]);
  expect(() => layout(dag)).toThrow("all node sizes must be positive");
});

test("sugiyama() throws with zero node height", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [1, 0]);
  expect(() => layout(dag)).toThrow("all node sizes must be positive");
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
