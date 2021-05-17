import { CoordOperator, NodeSizeAccessor } from "../../src/sugiyama/coord";
import {
  Dag,
  SugiDummyNode,
  coordCenter,
  coordGreedy,
  coordQuad,
  coordTopological,
  decrossOpt,
  decrossTwoLayer,
  layeringCoffmanGraham,
  layeringLongestPath,
  layeringSimplex,
  layeringTopological,
  sugiyama
} from "../../src";
import {
  SimpleDatum,
  doub,
  dummy,
  single,
  square,
  three,
  trip
} from "../examples";

import { DagNode } from "../../src/dag/node";
import { DecrossOperator } from "../../src/sugiyama/decross";
import { LayeringOperator } from "../../src/sugiyama/layering";

type SimpleNode = DagNode<SimpleDatum>;

test("sugiyama() correctly adapts to types", () => {
  const dag = square();
  const unks = dag as Dag;

  const init = sugiyama();
  init(dag);
  init(unks);

  // narrowed for custom
  const customLayering = layeringSimplex().rank(
    (() => undefined) as (node: SimpleNode) => undefined
  );
  const custom = init.layering(customLayering);
  custom(dag);
  // @ts-expect-error custom only takes SimpleNode
  custom(unks);

  // works for group too
  const acc = custom.nodeSize((() => [1, 1]) as (
    node: SimpleNode | SugiDummyNode
  ) => [1, 1]);
  acc(dag);
  // @ts-expect-error cast only takes TestNodes
  acc(unks);

  // still works for more general options
  const opt = acc.decross(decrossOpt());
  opt(dag);
  // @ts-expect-error opt only takes TestNodes
  opt(unks);

  // but we can still get original operator and operate on it
  const decross = opt.decross().large("large");
  expect(decross.large()).toBe("large");

  const unrelated: (
    node: DagNode<{ id: boolean }> | SugiDummyNode
  ) => [1, 1] = () => [1, 1];
  init.nodeSize(unrelated);
  // @ts-expect-error unrelated is unrelated to SimpleDatum
  opt.nodeSize(unrelated);
});

test("sugiyama() works for single node", () => {
  const dag = single();
  const [node] = sugiyama()(dag).dag;
  expect(node.x).toBeCloseTo(0.5);
  expect(node.y).toBeCloseTo(0.5);
});

test("sugiyama() works for double node vertically", () => {
  const dag = doub();
  const [first, second] = sugiyama().layering(layeringTopological())(dag).dag;
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
});

test("sugiyama() works for triple node horizontally", () => {
  const dag = trip();
  const [first, second, third] = sugiyama()(dag).dag;
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(1.5);
  expect(second.y).toBeCloseTo(0.5);
  expect(third.x).toBeCloseTo(2.5);
  expect(third.y).toBeCloseTo(0.5);
});

test("sugiyama() works for triple node horizontally sized", () => {
  const dag = trip();
  const [first, second, third] = sugiyama().size([6, 2])(dag).dag;
  expect(first.x).toBeCloseTo(1.0);
  expect(first.y).toBeCloseTo(1.0);
  expect(second.x).toBeCloseTo(3.0);
  expect(second.y).toBeCloseTo(1.0);
  expect(third.x).toBeCloseTo(5.0);
  expect(third.y).toBeCloseTo(1.0);
});

test("sugiyama() works with a dummy node", () => {
  const dag = dummy();
  const [first, second, third] = sugiyama()(dag).dag.idescendants("before");
  expect(first.y).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
  expect(third.y).toBeCloseTo(2.5);

  expect(first.x).toBeGreaterThanOrEqual(0.5);
  expect(first.x).toBeLessThan(1.0);
  expect(third.x).toBeGreaterThanOrEqual(0.5);
  expect(third.x).toBeLessThan(1.0);
  expect(first.x).toBeCloseTo(third.x);
  expect(first.x).not.toBeCloseTo(second.x);
  expect(Math.abs(first.x - second.x)).toBeLessThan(0.5);
});

test("sugiyama() allows changing nodeSize", () => {
  const base = three();

  function nodeSize(
    node: DagNode<SimpleDatum> | SugiDummyNode
  ): [number, number] {
    if (node instanceof SugiDummyNode) {
      return [1, 1];
    } else {
      const size = parseInt(node.data.id) + 1;
      return [size, size];
    }
  }

  const layout = sugiyama().nodeSize(nodeSize);
  expect(layout.nodeSize()).toEqual(nodeSize);
  const { dag, width, height } = layout(base);
  expect(width).toBeCloseTo(9);
  expect(height).toBeCloseTo(10);
  const [head, ...rest] = dag.idescendants("before");
  const [tail, ...mids] = rest.reverse();

  for (const node of dag) {
    expect(node.x).toBeGreaterThanOrEqual(1);
    expect(node.x).toBeLessThanOrEqual(8);
  }

  expect(head.y).toBeCloseTo(0.5);
  for (const mid of mids) {
    expect(mid.y).toBeCloseTo(3);
  }
  expect(tail.y).toBeCloseTo(7.5);
});

test("sugiyama() allows changing operators", () => {
  const dag = dummy();
  const layering: LayeringOperator<SimpleNode> = (dag) => {
    for (const [i, node] of dag.idescendants("before").entries()) {
      node.layer = i;
    }
  };
  const decross: DecrossOperator<SimpleNode> = () => undefined;
  const coord: CoordOperator<SimpleNode> = (layers): number => {
    for (const layer of layers) {
      const div = Math.max(1, layer.length);
      layer.forEach((node, i) => {
        node.x = i / div;
      });
    }
    return 1;
  };
  const nodeSize: NodeSizeAccessor<SimpleNode> = () => [2, 2];
  const layout = sugiyama()
    .layering(layering)
    .decross(decross)
    .coord(coord)
    .nodeSize(nodeSize)
    .size([1, 2]);
  expect(layout.layering()).toBe(layering);
  expect(layout.decross()).toBe(decross);
  expect(layout.coord()).toBe(coord);
  expect(layout.nodeSize()).toBe(nodeSize);
  expect(layout.size()).toEqual([1, 2]);
  // still runs
  layout(dag);
});

test("sugiyama() allows setting all builtin operators", () => {
  const dag = single();
  // mostly a type check
  const layout = sugiyama()
    .layering(layeringTopological())
    .layering(layeringSimplex())
    .layering(layeringLongestPath())
    .layering(layeringCoffmanGraham())
    .coord(coordCenter())
    .coord(coordQuad())
    .coord(coordGreedy())
    .coord(coordTopological())
    .decross(decrossTwoLayer())
    .decross(decrossOpt());
  // still runs, although it won't actually run much of this
  const [root] = layout(dag).dag;
  expect(root.x).toBeCloseTo(0.5);
  expect(root.y).toBeCloseTo(0.5);
});

test("sugiyama() throws with noop layering", () => {
  const dag = dummy();
  const layout = sugiyama().layering(() => undefined);
  expect(() => layout(dag)).toThrow(
    /layering did not assign layer to node '{"data":{"id":"0"},.*}'/
  );
});

test("sugiyama() throws with invalid layers", () => {
  // layers are weird
  const dag = dummy();
  const layout = sugiyama().layering((dag) => {
    for (const node of dag) {
      node.layer = -1;
    }
  });
  expect(() => layout(dag)).toThrow(
    /layering assigned a negative layer \(-1\) to node '{"data":{"id":"0"},.*}'/
  );
});

test("sugiyama() throws with flat layering", () => {
  // layers are weird
  const dag = dummy();
  const layout = sugiyama().layering((dag) => {
    for (const node of dag) {
      node.layer = 0;
    }
  });
  expect(() => layout(dag)).toThrow(
    /layering left child node '{"data":{"id":"1".*}.*}' \(0\) with a greater or equal layer to parent node '{"data":{"id":"0".*}.*}' \(0\)/
  );
});

test("sugiyama() throws with noop coord", () => {
  const dag = dummy();
  const layout = sugiyama().coord(() => 1);
  expect(() => layout(dag)).toThrow(
    /coord didn't assign an x to node '{"data":{"id":"0"},.*}'/
  );
});

test("sugiyama() throws with bad coord width", () => {
  const dag = dummy();
  const layout = sugiyama().coord(
    (layers: (DagNode & { x?: number })[][]): number => {
      for (const layer of layers) {
        for (const node of layer) {
          node.x = 2;
        }
      }
      return 1; // 1 < 2
    }
  );
  expect(() => layout(dag)).toThrow(
    "coord assgined an x (2) outside of [0, 1]"
  );
});

test("sugiyama() throws with negative node width", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [-1, 1]);
  expect(() => layout(dag)).toThrow(
    /all node sizes must be non-negative, but got width -1 and height 1 for node '{"data":{"id":"0".*}.*}'/
  );
});

test("sugiyama() throws with negative node height", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [1, -1]);
  expect(() => layout(dag)).toThrow(
    /all node sizes must be non-negative, but got width 1 and height -1 for node '{"data":{"id":"0".*}.*}'/
  );
});

test("sugiyama() throws with zero node height", () => {
  const dag = dummy();
  const layout = sugiyama().nodeSize(() => [1, 0]);
  expect(() => layout(dag)).toThrow(
    "at least one node must have positive height, but total height was zero"
  );
});

test("sugiyama() fails passing an arg to constructor", () => {
  // @ts-expect-error sugiyama takes no arguments
  expect(() => sugiyama(undefined)).toThrow("got arguments to sugiyama");
});
