import { Dag, DagNode } from "../../src/dag";
import { entries } from "../../src/iters";
import { SugiNodeSizeAccessor, sugiyama } from "../../src/sugiyama";
import { CoordOperator } from "../../src/sugiyama/coord";
import { center } from "../../src/sugiyama/coord/center";
import { greedy } from "../../src/sugiyama/coord/greedy";
import { quad } from "../../src/sugiyama/coord/quad";
import { topological as coordTopological } from "../../src/sugiyama/coord/topological";
import { DecrossOperator } from "../../src/sugiyama/decross";
import { opt } from "../../src/sugiyama/decross/opt";
import { twoLayer } from "../../src/sugiyama/decross/two-layer";
import { LayeringOperator } from "../../src/sugiyama/layering";
import { coffmanGraham } from "../../src/sugiyama/layering/coffman-graham";
import { longestPath } from "../../src/sugiyama/layering/longest-path";
import { simplex } from "../../src/sugiyama/layering/simplex";
import { topological as layeringTopological } from "../../src/sugiyama/layering/topological";
import { SugiNode } from "../../src/sugiyama/utils";
import { def } from "../../src/utils";
import { doub, dummy, SimpleDatum, single, three, trip } from "../examples";

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

  function sugiNodeSize(node: SugiNode<SimpleDatum>): [number, number] {
    if ("node" in node.data) {
      const size = parseInt(node.data.node.data.id) + 1;
      return [size, size];
    } else {
      return [1, 1];
    }
  }

  function nodeSize(node?: DagNode<SimpleDatum>): [number, number] {
    if (node) {
      const size = parseInt(node.data.id) + 1;
      return [size, size];
    } else {
      return [1, 1];
    }
  }

  const test = sugiyama().sugiNodeSize(sugiNodeSize);
  expect(test.sugiNodeSize()).toBe(sugiNodeSize);
  expect(test.nodeSize()).toBeNull();
  const layout = test.nodeSize(nodeSize);
  expect(layout.nodeSize()).toBe(nodeSize);
  expect(layout.sugiNodeSize().wrapped).toBe(nodeSize);
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
  const layering: LayeringOperator<SimpleDatum, unknown> = (dag) => {
    for (const [i, node] of entries(dag.idescendants("before"))) {
      node.value = i;
    }
  };
  const decross: DecrossOperator<SimpleDatum, unknown> = () => undefined;
  const coord: CoordOperator<SimpleDatum, unknown> = (layers): number => {
    for (const layer of layers) {
      const div = Math.max(1, layer.length);
      layer.forEach((node, i) => {
        node.x = i / div;
      });
    }
    return 1;
  };
  const sugiNodeSize: SugiNodeSizeAccessor<SimpleDatum, unknown> = () => [2, 2];
  const layout = sugiyama()
    .layering(layering)
    .decross(decross)
    .coord(coord)
    .sugiNodeSize(sugiNodeSize)
    .size([1, 2]);
  expect(layout.layering()).toBe(layering);
  expect(layout.decross()).toBe(decross);
  expect(layout.coord()).toBe(coord);
  expect(layout.sugiNodeSize()).toBe(sugiNodeSize);
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

const noop = () => undefined;

test("sugiyama() throws with noop layering", () => {
  const dag = dummy();
  const layout = sugiyama().layering(
    noop as LayeringOperator<unknown, unknown>
  );
  expect(() => layout(dag)).toThrow(
    `node with data '{"id":"0"}' did not get a defined value during layering`
  );
});

test("sugiyama() throws with invalid layers", () => {
  // layers are weird
  const dag = dummy();
  const layout = sugiyama().layering((dag: Dag) => {
    for (const node of dag) {
      node.value = -1;
    }
  });
  expect(() => layout(dag)).toThrow(
    `node with data '{"id":"0"}' got an invalid (negative) value during layering: -1`
  );
});

test("sugiyama() throws with flat layering", () => {
  // layers are weird
  const dag = dummy();
  const layout = sugiyama().layering((dag: Dag) => {
    for (const node of dag) {
      node.value = 0;
    }
  });
  expect(() => layout(dag)).toThrow(
    /layering left child data '{.*"id":"1".*}' \(0\) with greater or equal layer to parent data '{.*"id":"0".*}' \(0\)/
  );
});

test("sugiyama() throws with noop coord", () => {
  const dag = dummy();
  const layout = sugiyama().coord((() => 1) as CoordOperator<unknown, unknown>);
  expect(() => layout(dag)).toThrow(
    /coord didn't assign an x to node '{.*"data":{"id":"0"}.*}'/
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
    "coord assigned an x (2) greater than width (1)"
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
    return 1; // 1 < 2
  });
  expect(() => layout(dag)).toThrow(
    "coord assigned an x (-1) smaller than a previous node in the layer"
  );
});

test("sugiyama() throws with negative node width", () => {
  const dag = dummy();
  function ns(node: SugiNode): [number, number] {
    void node;
    return [-1, 1];
  }
  const layout = sugiyama().sugiNodeSize(ns);
  expect(() => layout(dag)).toThrow(
    /all node sizes must be non-negative, but got width -1 and height 1 for node '{.*"data":{"id":"0".*}.*}'/
  );
});

test("sugiyama() throws with negative node height", () => {
  const dag = dummy();
  function ns(node: SugiNode): [number, number] {
    void node;
    return [1, -1];
  }
  const layout = sugiyama().sugiNodeSize(ns);
  expect(() => layout(dag)).toThrow(
    /all node sizes must be non-negative, but got width 1 and height -1 for node '{.*"data":{"id":"0".*}.*}'/
  );
});

test("sugiyama() throws with zero node height", () => {
  const dag = dummy();
  function ns(node: SugiNode): [number, number] {
    void node;
    return [1, 0];
  }
  const layout = sugiyama().sugiNodeSize(ns);
  expect(() => layout(dag)).toThrow(
    "at least one node must have positive height, but total height was zero"
  );
});

test("sugiyama() fails passing an arg to constructor", () => {
  expect(() => sugiyama(null as never)).toThrow("got arguments to sugiyama");
});
