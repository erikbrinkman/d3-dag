import { expect, test } from "bun:test";
import { graph, Graph, GraphNode } from "../graph";
import { assert } from "../test-utils";
import {
  SugiDatum,
  sugifyCompact,
  sugifyLayer,
  SugiNode,
  unsugify,
} from "./sugify";

function noopLayering(): void {
  // noop
}

function nodeHeight(): number {
  return 2;
}

function dataHeight({ data }: GraphNode<number>): number {
  return data;
}

function expectLayersToSatisfyInvariants(
  layers: readonly (readonly SugiNode[])[],
  height: number,
): void {
  for (const layer of layers) {
    for (const sugi of layer) {
      expect(sugi.multi()).toBe(false);
      expect(sugi.acyclic()).toBe(true);
      expect(sugi.y).toBeGreaterThanOrEqual(0);
      expect(sugi.y).toBeLessThanOrEqual(height);
    }
  }
}

function expectGraphToSatisfyHeights(
  grf: Graph,
  {
    height = nodeHeight,
    gap = 1,
  }: { height?: (node: GraphNode) => number; gap?: number } = {},
): void {
  for (const { source, target } of grf.links()) {
    const sep = height(source) / 2 + height(target) / 2 + gap;
    expect(Math.abs(source.y - target.y)).toBeGreaterThanOrEqual(sep);
  }
}

function layer(data: SugiDatum): number {
  if (data.role === "node") {
    assert(data.topLayer === data.bottomLayer);
    return data.topLayer;
  } else {
    return data.layer;
  }
}

function topLayer(data: SugiDatum): number {
  if (data.role === "node") {
    return data.topLayer;
  } else {
    return data.layer;
  }
}

function bottomLayer(data: SugiDatum): number {
  if (data.role === "node") {
    return data.bottomLayer;
  } else {
    return data.layer;
  }
}

test("sugifyLayer() / unsugify() works for single node", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = 0;
  const [layers, height] = sugifyLayer(grf, nodeHeight, 1, 1, noopLayering);
  expect(height).toBeCloseTo(2);
  expectLayersToSatisfyInvariants(layers, height);

  const [[sugi]] = layers;
  expect(layer(sugi.data)).toEqual(0);
  expect(sugi.data.role).toBe("node");

  expect(sugi.y).toBeCloseTo(1);
  sugi.x = 1;

  unsugify(layers);
  expectGraphToSatisfyHeights(grf);
  expect(node.x).toBeCloseTo(1);
  expect(node.y).toBeCloseTo(1);
});

test("sugifyLayer() / unsugify() works for single edge", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link = grf.link(above, below);
  above.y = 0;
  below.y = 1;
  const [layers, height] = sugifyLayer(grf, nodeHeight, 1, 2, noopLayering);
  expect(height).toBeCloseTo(5);
  expectLayersToSatisfyInvariants(layers, height);

  const [[topSugi], [bottomSugi]] = layers;
  expect(layer(topSugi.data)).toEqual(0);
  expect(topSugi.data.role).toBe("node");
  expect(layer(bottomSugi.data)).toEqual(1);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  bottomSugi.x = 1;
  expect(bottomSugi.y).toBeCloseTo(4);
  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(1);
  expect(below.y).toBe(4);
  expect(link.points).toEqual([
    [1, 1],
    [1, 4],
  ]);
});

test("sugifyLayer() / unsugify() works for extended edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link1 = grf.link(above, below);
  const link2 = grf.link(above, below);
  above.y = 0;
  below.y = 1;
  const [layers, height] = sugifyLayer(grf, nodeHeight, 1, 2, noopLayering);
  expect(height).toBeCloseTo(5);
  expectLayersToSatisfyInvariants(layers, height);

  const [[topSugi], [linkSugiA, linkSugiB], [bottomSugi]] = layers;
  expect(layer(topSugi.data)).toEqual(0);
  expect(topSugi.data.role).toBe("node");
  expect(layer(linkSugiA.data)).toEqual(1);
  expect(linkSugiA.data.role).toBe("link");
  expect(layer(linkSugiB.data)).toEqual(1);
  expect(linkSugiB.data.role).toBe("link");
  expect(layer(bottomSugi.data)).toEqual(2);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  linkSugiA.x = 2;
  expect(linkSugiA.y).toBeCloseTo(2.5);
  linkSugiB.x = 3;
  expect(linkSugiB.y).toBeCloseTo(2.5);
  bottomSugi.x = 1;
  expect(bottomSugi.y).toBeCloseTo(4);
  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(1);
  expect(below.y).toBe(4);
  // NOTE order is brittle
  expect(link1.points).toEqual([
    [1, 1],
    [2, 2.5],
    [1, 4],
  ]);
  expect(link2.points).toEqual([
    [1, 1],
    [3, 2.5],
    [1, 4],
  ]);
});

test("sugifyLayer() works for extended inverted edges", () => {
  const grf = graph<undefined, undefined>();
  const above = grf.node();
  const below = grf.node();
  const link1 = grf.link(below, above);
  const link2 = grf.link(below, above);
  above.y = 0;
  below.y = 1;
  const [layers, height] = sugifyLayer(grf, nodeHeight, 1, 2, noopLayering);
  expect(height).toBeCloseTo(5);
  expectLayersToSatisfyInvariants(layers, height);

  const [[topSugi], [linkSugiA, linkSugiB], [bottomSugi]] = layers;
  expect(layer(topSugi.data)).toEqual(0);
  expect(topSugi.data.role).toBe("node");
  expect(layer(linkSugiA.data)).toEqual(1);
  expect(linkSugiA.data.role).toBe("link");
  expect(layer(linkSugiB.data)).toEqual(1);
  expect(linkSugiB.data.role).toBe("link");
  expect(layer(bottomSugi.data)).toEqual(2);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  linkSugiA.x = 1.5;
  expect(linkSugiA.y).toBeCloseTo(2.5);
  linkSugiB.x = 2.5;
  expect(linkSugiB.y).toBeCloseTo(2.5);
  bottomSugi.x = 2;
  expect(bottomSugi.y).toBeCloseTo(4);

  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(2);
  expect(below.y).toBe(4);
  // NOTE order is brittle
  expect(link1.points).toEqual([
    [2, 4],
    [1.5, 2.5],
    [1, 1],
  ]);
  expect(link2.points).toEqual([
    [2, 4],
    [2.5, 2.5],
    [1, 1],
  ]);
});

test("sugifyLayer() throws for missing layer", () => {
  const grf = graph<undefined, undefined>();
  grf.node();
  expect(() => sugifyLayer(grf, nodeHeight, 1, 0, noopLayering)).toThrow(
    "custom layering 'noopLayering' didn't assign a layer to a node",
  );
});

test("sugifyLayer() throws for edge in the same layer", () => {
  const grf = graph<undefined, undefined>();
  const left = grf.node();
  const right = grf.node();
  grf.link(left, right);
  left.y = 0;
  right.y = 0;
  expect(() => sugifyLayer(grf, nodeHeight, 1, 1, noopLayering)).toThrow(
    "custom layering 'noopLayering' assigned nodes with an edge to the same layer",
  );
});

test("sugifyLayer() throws for invalid layers", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = -1;
  expect(() => sugifyLayer(grf, nodeHeight, 1, 1, noopLayering)).toThrow(
    "custom layering 'noopLayering' assigned node an invalid layer: -1",
  );
  node.y = 1;
  expect(() => sugifyLayer(grf, nodeHeight, 1, 1, noopLayering)).toThrow(
    "custom layering 'noopLayering' assigned node an invalid layer: 1",
  );
});

test("sugifyLayer() throws for empty layers", () => {
  const grf = graph<undefined, undefined>();
  const node = grf.node();
  node.y = 0;
  expect(() => sugifyLayer(grf, nodeHeight, 1, 2, noopLayering)).toThrow(
    "custom layering 'noopLayering' didn't assign a node to every layer",
  );
});

test("sugifyCompact() / unsugify() works for single node", () => {
  const grf = graph<number, undefined>();
  const node = grf.node(2);
  node.y = 1;
  const height = 2;
  const layers = sugifyCompact(grf, dataHeight, height, noopLayering);
  expectLayersToSatisfyInvariants(layers, height);

  const [[sugi], [bottom]] = layers;
  expect(sugi).toBe(bottom);
  expect(sugi.data.role).toBe("node");
  expect(topLayer(sugi.data)).toBe(0);
  expect(bottomLayer(sugi.data)).toBe(1);

  expect(sugi.y).toBeCloseTo(1);
  sugi.x = 1;

  unsugify(layers);
  expectGraphToSatisfyHeights(grf);
  expect(node.x).toBeCloseTo(1);
  expect(node.y).toBeCloseTo(1);
});

test("sugifyCompact() / unsugify() works for single edge", () => {
  const grf = graph<number, undefined>();
  const above = grf.node(2);
  const below = grf.node(4);
  const link = grf.link(above, below);
  above.y = 1;
  below.y = 5;
  const height = 7;
  const layers = sugifyCompact(grf, dataHeight, height, noopLayering);
  expectLayersToSatisfyInvariants(layers, height);

  const [[topSugi], [topBottom], [bottomSugi], [bottomBottom]] = layers;
  expect(topBottom).toBe(topSugi);
  expect(bottomBottom).toBe(bottomSugi);

  expect(topLayer(topSugi.data)).toEqual(0);
  expect(bottomLayer(topSugi.data)).toEqual(1);
  expect(topSugi.data.role).toBe("node");
  expect(topLayer(bottomSugi.data)).toEqual(2);
  expect(bottomLayer(bottomSugi.data)).toEqual(3);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  bottomSugi.x = 2;
  expect(bottomSugi.y).toBeCloseTo(5);
  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(2);
  expect(below.y).toBe(5);
  expect(link.points).toEqual([
    [1, 1],
    [2, 5],
  ]);
});

test("sugifyCompact() / unsugify() works for extended edges", () => {
  const grf = graph<number, undefined>();
  const above = grf.node(2);
  const below = grf.node(4);
  const link1 = grf.link(above, below);
  const link2 = grf.link(above, below);
  above.y = 1;
  below.y = 6;
  const height = 8;
  const layers = sugifyCompact(grf, dataHeight, height, noopLayering);
  expectLayersToSatisfyInvariants(layers, height);

  const [
    [topSugi],
    [topBottom],
    [linkSugiA, linkSugiB],
    [bottomSugi],
    [bottomBottom],
  ] = layers;
  expect(topBottom).toBe(topSugi);
  expect(bottomBottom).toBe(bottomSugi);

  expect(topLayer(topSugi.data)).toEqual(0);
  expect(bottomLayer(topSugi.data)).toEqual(1);
  expect(topSugi.data.role).toBe("node");
  expect(topLayer(linkSugiA.data)).toEqual(2);
  expect(linkSugiA.data.role).toBe("link");
  expect(bottomLayer(linkSugiB.data)).toEqual(2);
  expect(linkSugiB.data.role).toBe("link");
  expect(topLayer(bottomSugi.data)).toEqual(3);
  expect(bottomLayer(bottomSugi.data)).toEqual(4);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  linkSugiA.x = 0;
  expect(linkSugiA.y).toBeCloseTo(3);
  linkSugiB.x = 2;
  expect(linkSugiB.y).toBeCloseTo(3);
  bottomSugi.x = 1;
  expect(bottomSugi.y).toBeCloseTo(6);
  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(below.x).toBe(1);
  expect(below.y).toBe(6);
  // NOTE order is brittle
  expect(link1.points).toEqual([
    [1, 1],
    [0, 3],
    [1, 6],
  ]);
  expect(link2.points).toEqual([
    [1, 1],
    [2, 3],
    [1, 6],
  ]);
});

test("sugifyCompact() / unsugify() works for extended duplicate edges", () => {
  const grf = graph<undefined, undefined>();
  const above1 = grf.node();
  const below1 = grf.node();
  grf.link(above1, below1);
  grf.link(above1, below1);
  const above2 = grf.node();
  const below2 = grf.node();
  grf.link(above2, below2);
  grf.link(above2, below2);
  above1.y = 1;
  below1.y = 4;
  above2.y = 1;
  below2.y = 4;
  const height = 5;
  const layers = sugifyCompact(grf, nodeHeight, height, noopLayering);
  expectLayersToSatisfyInvariants(layers, height);
  // only one dummy layer
  expect(layers).toHaveLength(5);
});

test("sugifyCompact() / unsugify() works with predefined cuts", () => {
  const grf = graph<number, undefined>();
  const above = grf.node(2);
  const below = grf.node(4);
  const extra = grf.node(3);
  const link1 = grf.link(above, below);
  const link2 = grf.link(above, below);
  above.y = 1;
  extra.y = 1.5;
  below.y = 7;
  const height = 9;
  const layers = sugifyCompact(grf, dataHeight, height, noopLayering);
  expectLayersToSatisfyInvariants(layers, height);

  // NOTE unpacking order not guaranteed
  const [
    [exSugi, topSugi],
    [exMid, topBottom],
    [exBottom, linkSugiA, linkSugiB],
    [bottomSugi],
    [bottomBottom],
  ] = layers;
  expect(topBottom).toBe(topSugi);
  expect(exMid).toBe(exSugi);
  expect(exBottom).toBe(exSugi);
  expect(bottomBottom).toBe(bottomSugi);

  expect(topLayer(topSugi.data)).toEqual(0);
  expect(bottomLayer(topSugi.data)).toEqual(1);
  expect(topSugi.data.role).toBe("node");
  expect(topLayer(exSugi.data)).toEqual(0);
  expect(bottomLayer(exSugi.data)).toEqual(2);
  expect(exSugi.data.role).toBe("node");
  expect(topLayer(linkSugiA.data)).toEqual(2);
  expect(linkSugiA.data.role).toBe("link");
  expect(bottomLayer(linkSugiB.data)).toEqual(2);
  expect(linkSugiB.data.role).toBe("link");
  expect(topLayer(bottomSugi.data)).toEqual(3);
  expect(bottomLayer(bottomSugi.data)).toEqual(4);
  expect(bottomSugi.data.role).toBe("node");

  topSugi.x = 1;
  expect(topSugi.y).toBeCloseTo(1);
  exSugi.x = 3;
  expect(exSugi.y).toBeCloseTo(1.5);
  linkSugiA.x = 0;
  expect(linkSugiA.y).toBeCloseTo(3);
  linkSugiB.x = 2;
  expect(linkSugiB.y).toBeCloseTo(3);
  bottomSugi.x = 1;
  expect(bottomSugi.y).toBeCloseTo(7);
  unsugify(layers);
  expectGraphToSatisfyHeights(grf);

  expect(above.x).toBe(1);
  expect(above.y).toBe(1);
  expect(extra.x).toBe(3);
  expect(extra.y).toBe(1.5);
  expect(below.x).toBe(1);
  expect(below.y).toBe(7);
  // NOTE order is brittle
  expect(link1.points).toEqual([
    [1, 1],
    [0, 3],
    [1, 7],
  ]);
  expect(link2.points).toEqual([
    [1, 1],
    [2, 3],
    [1, 7],
  ]);
});

test("sugifyCompact() throws for missing coordinate", () => {
  const grf = graph<undefined, undefined>();
  grf.node();
  expect(() => sugifyCompact(grf, nodeHeight, 1, noopLayering)).toThrow(
    "custom layering 'noopLayering' didn't assign a y coordinate to every node",
  );
});
