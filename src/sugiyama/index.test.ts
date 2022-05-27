import { sugiyama } from ".";
import { Graph, GraphNode } from "../graph";
import { NodeSize } from "../layout";
import { doub, dummy, multi, oh, single, three, trip } from "../test-graphs";
import { Coord } from "./coord";
import { Decross } from "./decross";
import { Layering } from "./layering";
import { layeringTopological } from "./layering/topological";
import { SugiNode } from "./sugify";

test("sugiyama() works for single node", () => {
  const dag = single();
  const layout = sugiyama();
  layout(dag);
  const [node] = dag;
  expect(node.x).toBeCloseTo(0.5);
  expect(node.y).toBeCloseTo(0.5);
});

test("sugiyama() works for double node vertically", () => {
  const dag = doub();
  const layout = sugiyama().layering(layeringTopological());
  layout(dag);
  const [first, second] = dag.topological();
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
});

test("sugiyama() works for triple node horizontally", () => {
  const dag = trip();
  const layout = sugiyama();
  layout(dag);
  const [first, second, third] = dag.topological();
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(1.5);
  expect(second.y).toBeCloseTo(0.5);
  expect(third.x).toBeCloseTo(2.5);
  expect(third.y).toBeCloseTo(0.5);
});

test("sugiyama() works for triple node horizontally sized", () => {
  const dag = trip();
  const layout = sugiyama().nodeSize(() => [2, 2]);
  layout(dag);
  const [first, second, third] = dag.topological();
  expect(first.x).toBeCloseTo(1.0);
  expect(first.y).toBeCloseTo(1.0);
  expect(second.x).toBeCloseTo(3.0);
  expect(second.y).toBeCloseTo(1.0);
  expect(third.x).toBeCloseTo(5.0);
  expect(third.y).toBeCloseTo(1.0);
});

test("sugiyama() works with a dummy node", () => {
  const dag = dummy();
  const layout = sugiyama();
  const { width, height } = layout(dag);
  const [first, second, third] = [...dag].sort(
    (a, b) => parseInt(a.data) - parseInt(b.data)
  );

  expect(width).toBeCloseTo(1.5);
  expect(height).toBeCloseTo(3);

  expect(first.y).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
  expect(third.y).toBeCloseTo(2.5);

  // NOTE these x's could flip, so this is brittle
  expect(first.x).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(1.0);
  expect(third.x).toBeCloseTo(0.5);
});

test("sugiyama() works with a multi dag", () => {
  const dag = multi();

  const layout = sugiyama().nodeSize([2, 2]).gap([1, 1]);
  const { width, height } = layout(dag);
  const [root, leaf] = dag.topological();

  // the width and height imply that the dummy nodes got positioned appropriately
  expect(width).toBeCloseTo(2);
  expect(height).toBeCloseTo(6);

  // NOTE either could be one or two, so this is brittle
  expect(root.x).toBeCloseTo(1);
  expect(root.y).toBeCloseTo(1);

  expect(leaf.x).toBeCloseTo(1);
  expect(leaf.y).toBeCloseTo(5);
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
  expect(height).toBeCloseTo(6);

  // NOTE either could be one or two, so this is brittle
  expect(root.x).toBeCloseTo(1);
  expect(leaf.x).toBeCloseTo(1);
  expect([root.y, leaf.y].sort()).toEqual([1, 5]);
});

test("sugiyama() allows changing nodeSize and gap", () => {
  const dag = three();

  function nodeSize(node: GraphNode<string>): [number, number] {
    const size = parseInt(node.data) + 1;
    return [size, size];
  }

  const layout = sugiyama().nodeSize(nodeSize).gap([2, 2]);
  expect(layout.nodeSize()).toBe(nodeSize);
  expect(layout.gap()).toEqual([2, 2]);
  const { width, height } = layout(dag);
  expect(width).toBeCloseTo(13);
  expect(height).toBeCloseTo(14);
  const [head, ...rest] = [...dag].sort(
    (a, b) => parseInt(a.data) - parseInt(b.data)
  );
  const [tail, ...mids] = rest.reverse();

  for (const node of mids) {
    expect(node.x).toBeGreaterThanOrEqual(1);
    expect(node.x).toBeLessThanOrEqual(12);
  }

  expect(head.y).toBeCloseTo(0.5);
  for (const mid of mids) {
    expect(mid.y).toBeCloseTo(5);
  }
  expect(tail.y).toBeCloseTo(11.5);
});

test("sugiyama() allows changing operators", () => {
  const dag = dummy();
  const layering: Layering<string, unknown> = <N extends string, L>(
    dag: Graph<N, L>
  ): number => {
    const ordered = [...dag].sort(
      (a, b) => parseInt(a.data) - parseInt(b.data)
    );
    for (const [i, node] of ordered.entries()) {
      node.y = i;
    }
    return dag.nnodes() - 1;
  };
  const decross: Decross<string, unknown> = () => undefined;
  const coord: Coord<string, unknown> = (layers): number => {
    for (const layer of layers) {
      const div = Math.max(1, layer.length);
      layer.forEach((node, i) => {
        node.x = i / div;
      });
    }
    return 1;
  };
  const nodeSize: NodeSize<string, unknown> = () => [0, 2];
  const layout = sugiyama()
    .layering(layering)
    .decross(decross)
    .coord(coord)
    .nodeSize(nodeSize);
  expect(layout.layering()).toBe(layering);
  expect(layout.decross()).toBe(decross);
  expect(layout.coord()).toBe(coord);
  expect(layout.nodeSize()).toBe(nodeSize);
  // still runs
  layout(dag);
});

const noop = (): number => 1;

test("sugiyama() throws with noop layering", () => {
  const dag = dummy();
  const layout = sugiyama().layering(noop);
  expect(() => layout(dag)).toThrow(
    "custom layering 'noop' didn't assign a layer to a node"
  );
});

test("sugiyama() throws with invalid layers", () => {
  // layers are weird
  const dag = single();

  function layering<N, L>(dag: Graph<N, L>): number {
    for (const node of dag) {
      node.y = -1;
    }
    return 1;
  }

  const layout = sugiyama().layering(layering);
  expect(() => layout(dag)).toThrow(
    `custom layering 'layering' assigned node an invalid layer: -1`
  );
});

test("sugiyama() throws with flat layering", () => {
  // layers are weird
  const dag = dummy();

  function layering<N, L>(dag: Graph<N, L>): number {
    for (const node of dag) {
      node.y = 0;
    }
    return 1;
  }

  const layout = sugiyama().layering(layering);
  expect(() => layout(dag)).toThrow(
    "custom layering 'layering' assigned nodes with an edge to the same layer"
  );
});

test("sugiyama() throws with noop coord", () => {
  const dag = dummy();
  const layout = sugiyama().coord((() => 1) as Coord<unknown, unknown>);
  expect(() => layout(dag)).toThrow(
    "custom coord 'anonymous' didn't assign an x to every node"
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
    "custom coord 'anonymous' assigned nodes too close for separation"
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
    "custom coord 'anonymous' assigned nodes too close for separation"
  );
});

test("sugiyama() throws with non-positive const node width", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([0, 1])).toThrow(
    "constant nodeSize must be positive, but got: [0, 1]"
  );
});

test("sugiyama() throws with non-positive const node height", () => {
  const layout = sugiyama();
  expect(() => layout.nodeSize([1, 0])).toThrow(
    "constant nodeSize must be positive, but got: [1, 0]"
  );
});

test("sugiyama() throws with negative node width", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [-1, 1]);
  expect(() => layout(dag)).toThrow(
    "all node sizes must be non-negative, but got width -1 and height 1 for node with data"
  );
});

test("sugiyama() throws with negative node height", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [1, -1]);
  expect(() => layout(dag)).toThrow(
    "all node sizes must be non-negative, but got width 1 and height -1 for node with data"
  );
});

test("sugiyama() throws with zero node height", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [1, 0]);
  expect(() => layout(dag)).toThrow(
    "at least one node must have positive height, but total height was zero"
  );
});

test("sugiyama() throws with negative gap width", () => {
  const layout = sugiyama();
  expect(() => layout.gap([-1, 1])).toThrow(
    "gap width (-1) and height (1) must be non-negative"
  );
});

test("sugiyama() fails passing an arg to constructor", () => {
  expect(() => sugiyama(null as never)).toThrow("got arguments to sugiyama");
});
