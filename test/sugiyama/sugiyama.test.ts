import {
  Operator as CoordOperator,
  Separation
} from "../../src/sugiyama/coord";
import { SimpleDatum, doub, dummy, single, three } from "../dags";
import {
  coordCenter,
  coordGreedy,
  coordMinCurve,
  coordTopological,
  coordVert,
  dagStratify,
  decrossOpt,
  decrossTwoLayer,
  layeringCoffmanGraham,
  layeringLongestPath,
  layeringSimplex,
  layeringTopological,
  sugiyama
} from "../../src";

import { DagNode } from "../../src/dag/node";
import { Operator as DecrossOperator } from "../../src/sugiyama/decross";
import { Operator as LayeringOperator } from "../../src/sugiyama/layering";

type SimpleNode = DagNode<SimpleDatum>;

test("sugiyama() works for single node", () => {
  const dag = dagStratify()(single);
  const [node] = sugiyama()(dag);
  expect(node.x).toBeCloseTo(0.5);
  expect(node.y).toBeCloseTo(0.5);
});

test("sugiyama() works for double node", () => {
  const dag = dagStratify()(doub);
  const [first, second] = sugiyama().layering(layeringTopological())(dag);
  expect(first.x).toBeCloseTo(0.5);
  expect(first.y).toBeCloseTo(0.0);
  expect(second.x).toBeCloseTo(0.5);
  expect(second.y).toBeCloseTo(1.0);
});

test("sugiyama() works with a dummy node", () => {
  const dag = dagStratify()(dummy);
  const [first, second, third] = sugiyama()(dag).idescendants("before");
  expect(first.y).toBeCloseTo(0);
  expect(second.y).toBeCloseTo(0.5);
  expect(third.y).toBeCloseTo(1.0);
  expect(first.x).not.toBeCloseTo(0.0);
  expect(first.x).not.toBeCloseTo(1.0);
  expect(third.x).not.toBeCloseTo(0.0);
  expect(third.x).not.toBeCloseTo(1.0);
  expect(first.x).toBeCloseTo(third.x);
  // NOTE this should specifically be > 0.5
  expect(first.x).not.toBeCloseTo(second.x, 0);
});

test("sugiyama() allows changing size", () => {
  const dag = dagStratify()(three);
  const layout = sugiyama().size([3, 3]);
  expect(layout.size()).toEqual([3, 3]);
  expect(layout.nodeSize()).toBeNull();
  const [head, ...rest] = layout(dag).idescendants("before");
  const [tail, ...mids] = rest.reverse();
  expect(head.x).toBeCloseTo(1.5);
  expect(head.y).toBeCloseTo(0);
  for (const mid of mids) {
    expect(mid.y).toBeCloseTo(1.5);
  }
  expect(Math.max(...mids.map((n) => n.x))).toBeCloseTo(3);
  expect(tail.x).toBeCloseTo(1.5);
  expect(tail.y).toBeCloseTo(3);
});

test("sugiyama() allows changing nodeSize", () => {
  const dag = dagStratify()(three);
  const layout = sugiyama().nodeSize([3, 3]);
  expect(layout.nodeSize()).toEqual([3, 3]);
  expect(layout.size()).toBeNull();
  const [head, ...rest] = layout(dag).idescendants("before");
  const [tail, ...mids] = rest.reverse();
  expect(head.x).toBeCloseTo(3);
  expect(head.y).toBeCloseTo(0);
  for (const mid of mids) {
    expect(mid.y).toBeCloseTo(3);
  }
  expect(Math.max(...mids.map((n) => n.x))).toBeCloseTo(6);
  expect(tail.x).toBeCloseTo(3);
  expect(tail.y).toBeCloseTo(6);
});

test("sugiyama() allows changing operators", () => {
  const dag = dagStratify<SimpleDatum>()(dummy);
  const layering: LayeringOperator<SimpleNode> = (dag) => {
    for (const [i, node] of dag.idescendants("before").entries()) {
      node.layer = i;
    }
  };
  const decross: DecrossOperator<SimpleNode> = () => undefined;
  const coord: CoordOperator<SimpleNode> = (layers) => {
    for (const layer of layers) {
      const div = Math.max(1, layer.length);
      layer.forEach((node, i) => {
        node.x = i / div;
      });
    }
  };
  const sep: Separation<SimpleNode> = () => 2;
  const layout = sugiyama<SimpleNode>()
    .layering(layering)
    .decross(decross)
    .coord(coord)
    .separation(sep)
    .debug(true);
  expect(layout.layering()).toBe(layering);
  expect(layout.decross()).toBe(decross);
  expect(layout.coord()).toBe(coord);
  expect(layout.separation()).toBe(sep);
  expect(layout.debug()).toBeTruthy();
  // still runs
  layout(dag);
});

test("sugiyama() allows setting all builtin operators", () => {
  const dag = dagStratify()(single);
  const layout = sugiyama()
    .layering(layeringTopological())
    .layering(layeringSimplex())
    .layering(layeringLongestPath())
    .layering(layeringCoffmanGraham())
    .coord(coordCenter())
    .coord(coordVert())
    .coord(coordMinCurve())
    .coord(coordGreedy())
    .coord(coordTopological())
    .decross(decrossTwoLayer())
    .decross(decrossOpt());
  // still runs, although it won't actually run much of this
  const [root] = layout(dag);
  expect(root.x).toBeCloseTo(0.5);
  expect(root.y).toBeCloseTo(0.5);
});

test("sugiyama() throws with noop layering", () => {
  const dag = dagStratify()(dummy);
  const layout = sugiyama().layering(() => undefined);
  expect(() => layout(dag)).toThrow(
    "layering did not assign layer to node '0'"
  );
});

test("sugiyama() throws with invalid layers", () => {
  // layers are weird
  const dag = dagStratify()(dummy);
  const layout = sugiyama().layering((dag) => {
    for (const node of dag) {
      node.layer = -1;
    }
  });
  expect(() => layout(dag)).toThrow(
    "layering assigned a negative layer (-1) to node '0'"
  );
});

test("sugiyama() throws with flat layering", () => {
  // layers are weird
  const dag = dagStratify()(dummy);
  const layout = sugiyama().layering((dag) => {
    for (const node of dag) {
      node.layer = 0;
    }
  });
  expect(() => layout(dag)).toThrow(
    `layering left child node "1" (0) with a greater or equal layer to parent node "0" (0)`
  );
});

test("sugiyama() throws with noop coord", () => {
  const dag = dagStratify()(dummy);
  const layout = sugiyama().coord(() => undefined);
  expect(() => layout(dag)).toThrow("coord didn't assign an x to node '0'");
});

test("sugiyama() fails passing an arg to constructor", () => {
  const willFail = (sugiyama as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to sugiyama");
});
