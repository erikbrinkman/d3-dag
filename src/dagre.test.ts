import { expect, test } from "bun:test";
import type {
  DagreAlgorithm,
  DagreGraphConfig,
  DagreLayoutNode,
  DagreQuality,
  Rankdir,
} from "./dagre.js";
import { DagreGraph, dagre } from "./dagre.js";
import type { GraphNode } from "./graph/index.js";
import { coordQuad } from "./sugiyama/coord/quad.js";
import { decrossOpt } from "./sugiyama/decross/opt.js";
import { sugiyama } from "./sugiyama/index.js";
import { layeringLongestPath } from "./sugiyama/layering/longest-path.js";
import { zherebko } from "./zherebko/index.js";

test("basic TB layout", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setDefaultEdgeLabel(() => ({}));
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setNode("c", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  grf.setEdge("b", "c");
  dagre.layout(grf);

  expect(grf.graph().width).toBeGreaterThan(0);
  expect(grf.graph().height).toBeGreaterThan(0);

  const a = grf.node("a");
  const b = grf.node("b");
  const c = grf.node("c");

  // TB: y should increase from a -> b -> c
  expect(a.y).toBeLessThan(b.y);
  expect(b.y).toBeLessThan(c.y);
});

test("BT direction", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "BT" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  // BT: parent should have higher y
  expect(grf.node("a").y).toBeGreaterThan(grf.node("b").y);
});

test("LR direction", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  // LR: x should increase from a -> b
  expect(grf.node("a").x).toBeLessThan(grf.node("b").x);
});

test("RL direction", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "RL" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  // RL: parent should have higher x
  expect(grf.node("a").x).toBeGreaterThan(grf.node("b").x);
});

test("ranksep separates ranks and nodesep separates siblings like dagre", () => {
  // positions and sizes from dagre; siblings b and c may come in either order
  const expected: Record<
    Rankdir,
    {
      root: [number, number];
      children: [number, number][];
      size: [number, number];
    }
  > = {
    TB: {
      root: [25, 5],
      children: [
        [5, 115],
        [45, 115],
      ],
      size: [50, 120],
    },
    BT: {
      root: [25, 115],
      children: [
        [5, 5],
        [45, 5],
      ],
      size: [50, 120],
    },
    LR: {
      root: [5, 25],
      children: [
        [115, 5],
        [115, 45],
      ],
      size: [120, 50],
    },
    RL: {
      root: [115, 25],
      children: [
        [5, 5],
        [5, 45],
      ],
      size: [120, 50],
    },
  };
  for (const rankdir of ["TB", "BT", "LR", "RL"] as const) {
    const { root, children, size } = expected[rankdir];
    const grf = new dagre.graphlib.Graph();
    grf.setGraph({ rankdir, ranksep: 100, nodesep: 30 });
    for (const id of ["a", "b", "c"]) {
      grf.setNode(id, { width: 10, height: 10 });
    }
    grf.setEdge("a", "b");
    grf.setEdge("a", "c");
    dagre.layout(grf);

    const position = (id: string): [number, number] => [
      grf.node(id).x,
      grf.node(id).y,
    ];
    const childPositions = [position("b"), position("c")].sort(
      ([leftX, leftY], [rightX, rightY]) => leftX - rightX || leftY - rightY,
    );
    const { width, height } = grf.graph();
    expect({ rankdir, root: position("a") }).toEqual({ rankdir, root });
    expect({ rankdir, children: childPositions }).toEqual({
      rankdir,
      children,
    });
    expect({ rankdir, size: [width, height] }).toEqual({ rankdir, size });
  }
});

test("per-node dimensions preserved", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 100, height: 50 });
  grf.setNode("b", { width: 200, height: 30 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  expect(grf.node("a").width).toBe(100);
  expect(grf.node("a").height).toBe(50);
  expect(grf.node("b").width).toBe(200);
  expect(grf.node("b").height).toBe(30);
});

test("isolated nodes are positioned", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setNode("isolated", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  const iso = grf.node("isolated");
  expect(typeof iso.x).toBe("number");
  expect(typeof iso.y).toBe("number");
  expect(iso.x).toBeGreaterThanOrEqual(0);
  expect(iso.y).toBeGreaterThanOrEqual(0);
});

test("node() throws for unknown id", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  expect(() => grf.node("nonexistent")).toThrow("unknown node");
});

test("nodes() returns all node ids", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");

  const ids = grf.nodes();
  expect(ids).toContain("a");
  expect(ids).toContain("b");
  expect(ids).toContain("c");
  expect(ids.length).toBe(3);
});

test("nodeCount and edgeCount", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");

  expect(grf.nodeCount()).toBe(2);
  expect(grf.edgeCount()).toBe(1);
});

test("edges() returns descriptors", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");

  const edges = grf.edges();
  expect(edges.length).toBe(1);
  expect(edges[0]).toEqual({ v: "a", w: "b" });
});

test("custom sugiyama operators", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setNode("c", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  dagre.layout(
    grf,
    sugiyama()
      .decross(decrossOpt())
      .coord(coordQuad())
      .layering(layeringLongestPath()),
  );

  expect(grf.graph().width).toBeGreaterThan(0);
  expect(grf.graph().height).toBeGreaterThan(0);
});

test("custom operator node size accessor", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 20 });
  grf.setNode("b");
  grf.setEdge("a", "b");

  dagre.layout(
    grf,
    sugiyama().nodeSize((node: GraphNode<DagreLayoutNode>) => [
      node.data.width,
      node.data.height,
    ]),
  );

  expect(grf.node("b").width).toBe(0);
  expect(grf.node("a").y).toBeLessThan(grf.node("b").y);
});

test("custom operator accessor can't read an unset position", () => {
  sugiyama().nodeSize((node: GraphNode<DagreLayoutNode>) => {
    // @ts-expect-error x is unset while the operator runs
    const xpos: number = node.data.x;
    return [xpos, node.data.height];
  });
});

test("layout with zherebko", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");

  dagre.layout(grf, zherebko());

  expect(grf.graph().width).toBeGreaterThan(0);
  expect(grf.graph().height).toBeGreaterThan(0);
  expect(grf.node("a").y).toBeLessThan(grf.node("b").y);
});

test("nodesep and ranksep affect spacing", () => {
  function buildAndLayout(nodesep: number, ranksep: number) {
    const grf = new dagre.graphlib.Graph();
    grf.setGraph({ nodesep, ranksep });
    grf.setNode("a", { width: 10, height: 10 });
    grf.setNode("b", { width: 10, height: 10 });
    grf.setEdge("a", "b");
    dagre.layout(grf);
    return grf.graph();
  }

  const tight = buildAndLayout(1, 1);
  const loose = buildAndLayout(10, 10);

  expect(loose.height).toBeGreaterThan(tight.height ?? 0);
});

test("layout places nodes without sizes as points, like dagre", () => {
  for (const algorithm of ["sugiyama", "grid", "zherebko"] as const) {
    for (const quality of ["fast", "medium", "slow"] as const) {
      const grf = new dagre.graphlib.Graph();
      grf.setGraph({ algorithm, quality });
      grf.setNode("a");
      grf.setEdge("a", "b");
      dagre.layout(grf);
      const a = grf.node("a");
      const b = grf.node("b");
      expect(a.width).toBe(0);
      expect(b.x).toBe(a.x);
      expect(b.y).toBeGreaterThan(a.y);
      expect(grf.graph().width).toBe(0);
    }
  }
});

test("setEdge auto-creates unknown endpoints like graphlib", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setEdge("a", "b");
  expect(grf.hasNode("a")).toBe(true);
  expect(grf.hasNode("b")).toBe(true);
  expect(grf.hasEdge("a", "b")).toBe(true);
});

test("setEdge auto-creates endpoints with the default node label", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setDefaultNodeLabel(() => ({ width: 10, height: 10 }));
  grf.setEdge("a", "b");
  dagre.layout(grf);
  expect(grf.node("a")).toMatchObject({ width: 10, height: 10 });
  expect(grf.node("b")).toMatchObject({ width: 10, height: 10 });
});

test("empty graph", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  dagre.layout(grf);
  expect(grf.graph().width).toBe(0);
  expect(grf.graph().height).toBe(0);
});

/** graph label with an extra field */
interface TitledGraphConfig extends DagreGraphConfig {
  title: string;
}

test("graph() returns the label passed to setGraph", () => {
  const grf = new dagre.graphlib.Graph();
  const label: TitledGraphConfig = {
    ranksep: 100,
    title: "flow",
  };
  grf.setGraph(label);
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  expect(grf.graph()).toBe(label);
  expect(label.title).toBe("flow");
  expect(label.width).toBe(10);
  expect(label.height).toBe(120);
});

test("setGraph replaces the earlier label", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR", nodesep: 10 });
  const second = { ranksep: 20 };
  grf.setGraph(second);

  expect(grf.graph()).toBe(second);
  expect(grf.graph().rankdir).toBeUndefined();
  expect(grf.graph().nodesep).toBeUndefined();
});

test("layout uses defaults for missing options without writing them", () => {
  const grf = new dagre.graphlib.Graph();
  const label = {};
  grf.setGraph(label);
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  // TB with the default ranksep of 50
  expect(grf.node("b").y - grf.node("a").y).toBe(60);
  expect(label).toEqual({ width: 10, height: 70 });
});

test("graph() returns undefined before setGraph, like graphlib", () => {
  const grf = new dagre.graphlib.Graph();
  expect(grf.graph()).toBeUndefined();
});

test("layout throws before setGraph", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a", { width: 10, height: 10 });
  expect(() => dagre.layout(grf)).toThrow(
    "setGraph must be called before dagre.layout",
  );
});

test("dagre graph throws on labels that aren't objects", () => {
  const grf = new dagre.graphlib.Graph();
  for (const label of ["label", 1, true, null, () => ({})]) {
    // @ts-expect-error graph labels must be objects
    expect(() => grf.setGraph(label)).toThrow("graph labels must be objects");
    // @ts-expect-error node labels must be objects
    expect(() => grf.setNode("a", label)).toThrow(
      "node labels must be objects",
    );
    // @ts-expect-error edge labels must be objects
    expect(() => grf.setEdge("a", "b", label)).toThrow(
      "edge labels must be objects",
    );
  }
  expect(grf.graph()).toBeUndefined();
  expect(grf.nodeCount()).toBe(0);
  expect(grf.edgeCount()).toBe(0);
});

test("default node labels that aren't objects throw", () => {
  const grf = new dagre.graphlib.Graph();
  // @ts-expect-error node labels must be objects
  grf.setDefaultNodeLabel(() => "label");
  expect(() => grf.setNode("a")).toThrow("node labels must be objects");
  expect(() => grf.setEdge("a", "b", {})).toThrow(
    "node labels must be objects",
  );
  expect(grf.nodeCount()).toBe(0);
  grf.setNode("a", {});
  expect<object>(grf.node("a")).toEqual({});
});

test("DagreGraph setGraph requires a label", () => {
  const grf = new DagreGraph();
  // @ts-expect-error label is required
  expect(() => grf.setGraph()).toThrow("graph labels must be objects");
  expect(grf.graph()).toBeUndefined();
});

test("hasNode and hasEdge", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");

  expect(grf.hasNode("a")).toBe(true);
  expect(grf.hasNode("missing")).toBe(false);
  expect(grf.hasEdge("a", "b")).toBe(true);
  expect(grf.hasEdge("b", "a")).toBe(false);
});

test("removeNode", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  grf.removeNode("b");

  expect(grf.hasNode("b")).toBe(false);
  expect(grf.nodeCount()).toBe(1);
  expect(grf.edgeCount()).toBe(0);
});

test("removeEdge", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  grf.removeEdge("a", "b");

  expect(grf.hasEdge("a", "b")).toBe(false);
  expect(grf.edgeCount()).toBe(0);
  expect(grf.nodeCount()).toBe(2);
});

test("setNode updates existing node", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("a", { width: 50, height: 50 });
  dagre.layout(grf);

  expect(grf.nodeCount()).toBe(1);
  expect(grf.node("a").width).toBe(50);
  expect(grf.node("a").height).toBe(50);
});

test("node returns the label passed to setNode", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  const label = { label: "A", width: 10, height: 10 };
  grf.setNode("a", label);
  dagre.layout(grf);

  const node: object = grf.node("a");
  expect(node).toBe(label);
  expect(node).toEqual({ label: "A", width: 10, height: 10, x: 5, y: 5 });
});

test("setNode replaces the label of an existing node", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  const label = { width: 20, height: 20 };
  grf.setNode("a", label);
  grf.setNode("a");
  dagre.layout(grf);

  const node: object = grf.node("a");
  expect(node).toBe(label);
  expect(grf.node("a")).toEqual({ width: 20, height: 20, x: 10, y: 10 });
});

test("edge returns the label passed to setEdge", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  const label = { label: "AB", minlen: 2 };
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b", label);

  const edge: object = grf.edge("a", "b");
  expect(edge).toBe(label);
  expect(edge).toEqual({ label: "AB", minlen: 2 });
  dagre.layout(grf);
  expect(edge).toEqual({
    label: "AB",
    minlen: 2,
    points: grf.edge("a", "b").points,
  });
  expect(grf.edge("a", "b").points.length).toBeGreaterThan(0);
});

test("setEdge replaces the label of an existing edge", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setEdge("a", "b", { label: "first" });
  const label = { label: "second" };
  grf.setEdge("a", "b", label);
  grf.setEdge("a", "b");

  expect(grf.edgeCount()).toBe(1);
  const edge: object = grf.edge("a", "b");
  expect(edge).toBe(label);
});

test("setEdge is idempotent", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  grf.setEdge("a", "b");

  expect(grf.edgeCount()).toBe(1);
});

test("edge() returns control points after layout", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  const e = grf.edge("a", "b");
  expect(e.points).toBeDefined();
  expect(e.points.length).toBeGreaterThan(0);
});

test("edge() throws for missing edge", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  expect(() => grf.edge("a", "b")).toThrow("unknown edge");
});

test("setters return this for chaining", () => {
  const grf = new dagre.graphlib.Graph();
  const result = grf
    .setGraph({ rankdir: "LR" })
    .setDefaultNodeLabel(() => ({ width: 10, height: 10 }))
    .setDefaultEdgeLabel(() => ({}))
    .setNode("a")
    .setNode("b")
    .setEdge("a", "b");

  expect(result).toBe(grf);
});

test("graph().width/height set by layout", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 40, height: 40 });
  grf.setNode("b", { width: 40, height: 40 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  expect(grf.graph().width).toBeGreaterThan(0);
  expect(grf.graph().height).toBeGreaterThan(0);
});

for (const quality of [
  "fast",
  "medium",
  "slow",
] as const satisfies readonly DagreQuality[]) {
  test(`dagre quality preset "${quality}" produces valid layout`, () => {
    const grf = new dagre.graphlib.Graph();
    grf.setGraph({ quality });
    grf.setNode("a", { width: 10, height: 10 });
    grf.setNode("b", { width: 10, height: 10 });
    grf.setNode("c", { width: 10, height: 10 });
    grf.setEdge("a", "b");
    grf.setEdge("a", "c");
    grf.setEdge("b", "c");
    dagre.layout(grf);

    expect(grf.graph().width).toBeGreaterThan(0);
    expect(grf.graph().height).toBeGreaterThan(0);

    for (const id of ["a", "b", "c"]) {
      const n = grf.node(id);
      expect(typeof n.x).toBe("number");
      expect(typeof n.y).toBe("number");
    }

    const e = grf.edge("a", "b");
    expect(e.points.length).toBeGreaterThan(0);
  });
}

test("setDefaultNodeLabel", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setDefaultNodeLabel(() => ({ width: 42, height: 24 }));
  grf.setNode("a");
  grf.setNode("b", { width: 10 });
  dagre.layout(grf);

  expect(grf.node("a").width).toBe(42);
  expect(grf.node("a").height).toBe(24);
  // explicit label overrides default
  expect(grf.node("b").width).toBe(10);
  expect(grf.node("b").height).toBe(0);
});

test("setDefaultEdgeLabel accepted for compatibility", () => {
  const grf = new dagre.graphlib.Graph();
  const result = grf.setDefaultEdgeLabel(() => ({ custom: "value" }));
  expect(result).toBe(grf);

  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  expect<object>(grf.edge("a", "b")).toEqual({});
});

test("isCompound", () => {
  const grf = new dagre.graphlib.Graph();
  expect(grf.isCompound()).toBe(false);
});

test("isMultigraph", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  expect(grf.isMultigraph()).toBe(false);
});

test("setPath", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setNode("d");
  grf.setPath(["a", "b", "c", "d"]);

  expect(grf.edgeCount()).toBe(3);
  expect(grf.hasEdge("a", "b")).toBe(true);
  expect(grf.hasEdge("b", "c")).toBe(true);
  expect(grf.hasEdge("c", "d")).toBe(true);
});

test("setPath returns this", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  expect(grf.setPath(["a", "b"])).toBe(grf);
});

test("nodeEdges", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("c", "b");

  const edges = grf.nodeEdges("b");
  expect(edges.length).toBe(2);
  expect(edges).toContainEqual({ v: "a", w: "b" });
  expect(edges).toContainEqual({ v: "c", w: "b" });
});

test("nodeEdges with second arg", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("c", "b");

  const edges = grf.nodeEdges("b", "a");
  expect(edges.length).toBe(1);
  expect(edges[0]).toEqual({ v: "a", w: "b" });
});

test("inEdges with second arg", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("c", "b");

  const edges = grf.inEdges("b", "a");
  expect(edges.length).toBe(1);
  expect(edges[0]).toEqual({ v: "a", w: "b" });

  const noEdges = grf.inEdges("a", "b");
  expect(noEdges.length).toBe(0);
});

test("outEdges with second arg", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  const edges = grf.outEdges("a", "b");
  expect(edges.length).toBe(1);
  expect(edges[0]).toEqual({ v: "a", w: "b" });
});

test("filterNodes", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 20, height: 20 });
  grf.setNode("c", { width: 30, height: 30 });
  grf.setEdge("a", "b");
  grf.setEdge("b", "c");
  grf.setEdge("a", "c");

  const filtered = grf.filterNodes((id) => id !== "b");

  expect(filtered.nodeCount()).toBe(2);
  expect(filtered.hasNode("a")).toBe(true);
  expect(filtered.hasNode("c")).toBe(true);
  expect(filtered.hasNode("b")).toBe(false);
  // a->c survives, a->b and b->c do not
  expect(filtered.edgeCount()).toBe(1);
  expect(filtered.hasEdge("a", "c")).toBe(true);
  // the graph label is shared, as in graphlib
  expect(filtered.graph()).toBe(grf.graph());
  // node labels are shared, as in graphlib
  expect(filtered.node("a").width).toBe(10);
  expect(filtered.node("c").width).toBe(30);
});

test("predecessors", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "c");
  grf.setEdge("b", "c");

  const preds = grf.predecessors("c");
  expect(preds).toContain("a");
  expect(preds).toContain("b");
  expect(preds.length).toBe(2);
  expect(grf.predecessors("a")).toEqual([]);
});

test("predecessors throws for unknown node", () => {
  const grf = new dagre.graphlib.Graph();
  expect(() => grf.predecessors("x")).toThrow("unknown node");
});

test("successors", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  const succs = grf.successors("a");
  expect(succs).toContain("b");
  expect(succs).toContain("c");
  expect(succs.length).toBe(2);
  expect(grf.successors("c")).toEqual([]);
});

test("successors throws for unknown node", () => {
  const grf = new dagre.graphlib.Graph();
  expect(() => grf.successors("x")).toThrow("unknown node");
});

test("neighbors", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("c", "a");

  const nbrs = grf.neighbors("a");
  expect(nbrs).toContain("b");
  expect(nbrs).toContain("c");
  expect(nbrs.length).toBe(2);
});

test("neighbors deduplicates", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b");
  grf.setEdge("b", "a");

  // b is both predecessor and successor of a — should appear once
  const nbrs = grf.neighbors("a");
  expect(nbrs).toEqual(["b"]);
});

test("neighbors throws for unknown node", () => {
  const grf = new dagre.graphlib.Graph();
  expect(() => grf.neighbors("x")).toThrow("unknown node");
});

test("sources", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  const srcs = grf.sources();
  expect(srcs).toEqual(["a"]);
});

test("sinks", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "c");
  grf.setEdge("b", "c");

  const snks = grf.sinks();
  expect(snks).toEqual(["c"]);
});

test("isDirected", () => {
  const grf = new dagre.graphlib.Graph();
  expect(grf.isDirected()).toBe(true);
});

test("setNodes", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNodes(["a", "b", "c"], { width: 20, height: 10 });

  expect(grf.nodeCount()).toBe(3);
  expect(grf.node("a").width).toBe(20);
  expect(grf.node("b").height).toBe(10);
});

test("setNodes returns this", () => {
  const grf = new dagre.graphlib.Graph();
  expect(grf.setNodes(["a"])).toBe(grf);
});

test("setNodes uses default label", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setDefaultNodeLabel(() => ({ width: 42, height: 24 }));
  grf.setNodes(["a", "b"]);

  expect(grf.node("a").width).toBe(42);
  expect(grf.node("b").height).toBe(24);
});

test("filterNodes preserves default labels", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setDefaultNodeLabel(() => ({ width: 99, height: 99 }));
  grf.setNode("a");
  grf.setNode("b");

  const filtered = grf.filterNodes(() => true);
  filtered.setNode("c");

  expect(filtered.node("c").width).toBe(99);
});

for (const algorithm of [
  "sugiyama",
  "zherebko",
  "grid",
] as const satisfies readonly DagreAlgorithm[]) {
  test(`dagre algorithm "${algorithm}" produces valid layout`, () => {
    const grf = new dagre.graphlib.Graph();
    grf.setGraph({ algorithm });
    grf.setNode("a", { width: 10, height: 10 });
    grf.setNode("b", { width: 10, height: 10 });
    grf.setNode("c", { width: 10, height: 10 });
    grf.setEdge("a", "b");
    grf.setEdge("b", "c");
    dagre.layout(grf);

    expect(grf.graph().width).toBeGreaterThan(0);
    expect(grf.graph().height).toBeGreaterThan(0);

    for (const id of ["a", "b", "c"]) {
      const n = grf.node(id);
      expect(typeof n.x).toBe("number");
      expect(typeof n.y).toBe("number");
    }

    // TB: y should increase
    expect(grf.node("a").y).toBeLessThan(grf.node("b").y);
    expect(grf.node("b").y).toBeLessThan(grf.node("c").y);
  });
}

test("algorithm zherebko with LR direction", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ algorithm: "zherebko", rankdir: "LR" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  expect(grf.node("a").x).toBeLessThan(grf.node("b").x);
});

test("algorithm grid with BT direction", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ algorithm: "grid", rankdir: "BT" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  expect(grf.node("a").y).toBeGreaterThan(grf.node("b").y);
});

test("single-node graph", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 40, height: 40 });
  dagre.layout(grf);

  expect(grf.graph().width).toBeGreaterThan(0);
  expect(grf.graph().height).toBeGreaterThan(0);
  const a = grf.node("a");
  expect(typeof a.x).toBe("number");
  expect(typeof a.y).toBe("number");
});

for (const ranker of [
  "network-simplex",
  "longest-path",
  "topological",
] as const) {
  test(`dagre ranker "${ranker}" produces valid layout`, () => {
    const grf = new dagre.graphlib.Graph();
    grf.setGraph({ ranker });
    grf.setNode("a", { width: 10, height: 10 });
    grf.setNode("b", { width: 10, height: 10 });
    grf.setNode("c", { width: 10, height: 10 });
    grf.setEdge("a", "b");
    grf.setEdge("b", "c");
    dagre.layout(grf);

    expect(grf.graph().width).toBeGreaterThan(0);
    expect(grf.graph().height).toBeGreaterThan(0);
    expect(grf.node("a").y).toBeLessThan(grf.node("b").y);
  });
}

test("edge().points returns {x, y} objects", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({});
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");
  dagre.layout(grf);

  const pts = grf.edge("a", "b").points;
  expect(pts.length).toBeGreaterThan(0);
  for (const p of pts) {
    expect(typeof p.x).toBe("number");
    expect(typeof p.y).toBe("number");
  }
});

test("setEdge keeps weight without using it", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b", { weight: 2 });
  expect(grf.edgeCount()).toBe(1);
  expect(grf.edge("a", "b")).toMatchObject({ weight: 2 });
});

test("removeNode on nonexistent is a no-op", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  expect(grf.removeNode("missing")).toBe(grf);
  expect(grf.nodeCount()).toBe(1);
});

test("removeEdge on nonexistent is a no-op", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  expect(grf.removeEdge("a", "b")).toBe(grf);
});

test("inEdges without filter", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "c");
  grf.setEdge("b", "c");

  const edges = grf.inEdges("c");
  expect(edges.length).toBe(2);
  expect(edges).toContainEqual({ v: "a", w: "c" });
  expect(edges).toContainEqual({ v: "b", w: "c" });
});

test("outEdges without filter", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setNode("c");
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  const edges = grf.outEdges("a");
  expect(edges.length).toBe(2);
  expect(edges).toContainEqual({ v: "a", w: "b" });
  expect(edges).toContainEqual({ v: "a", w: "c" });
});

test("inEdges throws for unknown node", () => {
  const grf = new dagre.graphlib.Graph();
  expect(() => grf.inEdges("missing")).toThrow("unknown node");
});

test("outEdges throws for unknown node", () => {
  const grf = new dagre.graphlib.Graph();
  expect(() => grf.outEdges("missing")).toThrow("unknown node");
});

test("custom operator with rankdir LR does not overlap siblings", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  grf.setNode("a", { width: 172, height: 36 });
  grf.setNode("b", { width: 172, height: 36 });
  grf.setNode("c", { width: 172, height: 36 });
  grf.setEdge("a", "b");
  grf.setEdge("a", "c");

  // the README's showcased combination: rankdir LR plus a custom operator
  dagre.layout(grf, sugiyama().decross(decrossOpt()).coord(coordQuad()));

  // b and c are siblings on the same rank; under LR they share an x and must be
  // separated by at least their full height along y (no overlap)
  const b = grf.node("b");
  const c = grf.node("c");
  expect(b.x).toBeCloseTo(c.x);
  expect(Math.abs(b.y - c.y)).toBeGreaterThanOrEqual(36);
});

test("custom operator honors rankdir from graph config", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");

  // graph config applies on top of a custom operator, so rankdir LR still flips
  dagre.layout(grf, sugiyama());

  // LR layout: successive ranks advance in x, sharing a y
  expect(grf.node("a").x).not.toBe(grf.node("b").x);
  expect(grf.node("a").y).toBe(grf.node("b").y);
});
