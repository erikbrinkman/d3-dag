import { CoordOperator, NodeSizeAccessor } from "../../src/sugiyama/coord";
import { Dag, DagNode } from "../../src/dag/node";
import {
  SimpleDatum,
  doub,
  dummy,
  single,
  square,
  three,
  trip
} from "../examples";

import { DecrossOperator } from "../../src/sugiyama/decross";
import { DummyNode } from "../../src/sugiyama/dummy";
import { LayeringOperator } from "../../src/sugiyama/layering";
import { center } from "../../src/sugiyama/coord/center";
import { coffmanGraham } from "../../src/sugiyama/layering/coffman-graham";
import { topological as coordTopological } from "../../src/sugiyama/coord/topological";
import { def } from "../../src/utils";
import { greedy } from "../../src/sugiyama/coord/greedy";
import { topological as layeringTopological } from "../../src/sugiyama/layering/topological";
import { longestPath } from "../../src/sugiyama/layering/longest-path";
import { opt } from "../../src/sugiyama/decross/opt";
import { quad } from "../../src/sugiyama/coord/quad";
import { simplex } from "../../src/sugiyama/layering/simplex";
import { sugiyama } from "../../src/sugiyama";
import { twoLayer } from "../../src/sugiyama/decross/two-layer";

type SimpleNode = DagNode<SimpleDatum>;

test("sugiyama() correctly adapts to types", () => {
  const dag = square();
  const unks = dag as Dag;

  const init = sugiyama();
  init(dag);
  init(unks);

  // narrowed for custom
  const customLayering = simplex().rank(
    (() => undefined) as (node: SimpleNode) => undefined
  );
  const custom = init.layering(customLayering);
  custom(dag);
  // @ts-expect-error custom only takes SimpleNode
  custom(unks);

  // works for group too
  const acc = custom.nodeSize(
    (() => [1, 1] as const) as (node: SimpleNode | DummyNode) => readonly [1, 1]
  );
  acc(dag);
  // @ts-expect-error cast only takes TestNodes
  acc(unks);

  // still works for more general options
  const optimal = acc.decross(opt());
  optimal(dag);
  // @ts-expect-error opt only takes TestNodes
  optimal(unks);

  // but we can still get original operator and operate on it
  const decrossing = optimal.decross().large("large");
  expect(decrossing.large()).toBe("large");

  const unrelated: (
    node: DagNode<{ id: boolean }> | DummyNode
  ) => [1, 1] = () => [1, 1];
  init.nodeSize(unrelated);
  // @ts-expect-error unrelated is unrelated to SimpleDatum
  optimal.nodeSize(unrelated);
});

test("sugiyama() works for single node", () => {
  const dag = single();
  const [node] = dag;
  sugiyama()(dag);
  expect(node.x).toBeCloseTo(0.5);
  expect(node.y).toBeCloseTo(0.5);
});

test("sugiyama() works for double node vertically", () => {
  const dag = doub();
  const [first, second] = dag;
  sugiyama().layering(layeringTopological())(dag);
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
});

test("sugiyama() works for triple node horizontally", () => {
  const dag = trip();
  const [first, second, third] = dag;
  sugiyama()(dag);
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.x).toBeCloseTo(1.5);
  expect(second.y).toBeCloseTo(0.5);
  expect(third.x).toBeCloseTo(2.5);
  expect(third.y).toBeCloseTo(0.5);
});

test("sugiyama() works for triple node horizontally sized", () => {
  const dag = trip();
  const [first, second, third] = dag;
  sugiyama().size([6, 2])(dag);
  expect(first.x).toBeCloseTo(1.0);
  expect(first.y).toBeCloseTo(1.0);
  expect(second.x).toBeCloseTo(3.0);
  expect(second.y).toBeCloseTo(1.0);
  expect(third.x).toBeCloseTo(5.0);
  expect(third.y).toBeCloseTo(1.0);
});

test("sugiyama() works with a dummy node", () => {
  const dag = dummy();
  const [first, second, third] = dag.idescendants("before");
  sugiyama()(dag);
  expect(first.y).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.5);
  expect(third.y).toBeCloseTo(2.5);

  expect(first.x).toBeGreaterThanOrEqual(0.5);
  expect(first.x).toBeLessThan(1.0);
  expect(third.x).toBeGreaterThanOrEqual(0.5);
  expect(third.x).toBeLessThan(1.0);
  expect(first.x).toBeCloseTo(def(third.x));
  expect(first.x).not.toBeCloseTo(def(second.x));
  expect(Math.abs(def(first.x) - def(second.x))).toBeLessThan(0.5);
});

test("sugiyama() allows changing nodeSize", () => {
  const dag = three();

  function nodeSize(node: SimpleNode | DummyNode): [number, number] {
    if (node instanceof DummyNode) {
      return [1, 1];
    } else {
      const size = parseInt(node.data.id) + 1;
      return [size, size];
    }
  }

  const layout = sugiyama().nodeSize(nodeSize);
  expect(layout.nodeSize()).toEqual(nodeSize);
  const { width, height } = layout(dag);
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
  const layering: LayeringOperator<SimpleDatum> = (dag) => {
    for (const [i, node] of dag.idescendants("before").entries()) {
      node.value = i;
    }
  };
  const decross: DecrossOperator<SimpleDatum> = () => undefined;
  const coord: CoordOperator<SimpleDatum> = (layers): number => {
    for (const layer of layers) {
      const div = Math.max(1, layer.length);
      layer.forEach((node, i) => {
        node.x = i / div;
      });
    }
    return 1;
  };
  const nodeSize: NodeSizeAccessor<SimpleDatum> = () => [2, 2];
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
  const [root] = dag;
  // mostly a type check
  const layout = sugiyama()
    .layering(layeringTopological())
    .layering(simplex())
    .layering(longestPath())
    .layering(coffmanGraham())
    .coord(center())
    .coord(quad())
    .coord(greedy())
    .coord(coordTopological())
    .decross(twoLayer())
    .decross(opt());
  // still runs, although it won't actually run much of this
  layout(dag);
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
      node.value = -1;
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
      node.value = 0;
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
  const layout = sugiyama().coord((layers: DagNode[][]): number => {
    for (const layer of layers) {
      for (const node of layer) {
        node.x = 2;
      }
    }
    return 1; // 1 < 2
  });
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
