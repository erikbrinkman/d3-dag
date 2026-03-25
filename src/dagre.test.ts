import { expect, test } from "bun:test";
import type { DagreAlgorithm, DagreQuality } from "./dagre";
import { dagre } from "./dagre";
import { sugiyama } from "./sugiyama";
import { coordQuad } from "./sugiyama/coord/quad";
import { decrossOpt } from "./sugiyama/decross/opt";
import { layeringLongestPath } from "./sugiyama/layering/longest-path";
import { zherebko } from "./zherebko";

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

test("per-node dimensions preserved", () => {
  const grf = new dagre.graphlib.Graph();
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

test("layout with zherebko", () => {
  const grf = new dagre.graphlib.Graph();
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

  expect(loose.height).toBeGreaterThan(tight.height);
});

test("throws for edge with unknown source", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  expect(() => grf.setEdge("missing", "a")).toThrow("unknown source node");
});

test("throws for edge with unknown target", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  expect(() => grf.setEdge("a", "missing")).toThrow("unknown target node");
});

test("empty graph", () => {
  const grf = new dagre.graphlib.Graph();
  dagre.layout(grf);
  expect(grf.graph().width).toBe(0);
  expect(grf.graph().height).toBe(0);
});

test("graph() returns config", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 100 });

  expect(grf.graph().rankdir).toBe("LR");
  expect(grf.graph().nodesep).toBe(50);
  expect(grf.graph().ranksep).toBe(100);
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
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("a", { width: 50, height: 50 });
  dagre.layout(grf);

  expect(grf.nodeCount()).toBe(1);
  expect(grf.node("a").width).toBe(50);
  expect(grf.node("a").height).toBe(50);
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
  grf.setDefaultNodeLabel(() => ({ width: 42, height: 24 }));
  grf.setNode("a");
  grf.setNode("b", { width: 10 });

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
  expect(grf.edge("a", "b").points).toEqual([]);
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
  // config is copied
  expect(filtered.graph().rankdir).toBe("LR");
  // dimensions are copied
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

test("setEdge accepts and ignores label", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setNode("a");
  grf.setNode("b");
  grf.setEdge("a", "b", { weight: 2 });
  expect(grf.edgeCount()).toBe(1);
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

test("graph() returns a copy", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  const cfg = grf.graph();
  cfg.rankdir = "BT";
  // mutation should not affect internal state
  expect(grf.graph().rankdir).toBe("LR");
});

test("custom operator does not get extra direction tweak", () => {
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: "LR" });
  grf.setNode("a", { width: 10, height: 10 });
  grf.setNode("b", { width: 10, height: 10 });
  grf.setEdge("a", "b");

  // custom operator with no direction tweaks — should layout TB (operator default)
  dagre.layout(grf, sugiyama());

  // since no direction tweak was applied, layout is TB: y should differ
  expect(grf.node("a").y).not.toBe(grf.node("b").y);
});
