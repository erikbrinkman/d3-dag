/**
 * utilities for testing
 *
 * @internal
 * @packageDocumentation
 */
import {
  Graph,
  graph,
  GraphNode,
  MutGraph,
  MutGraphLink,
  MutGraphNode,
} from "../graph";
import { entries, map, reverse } from "../iters";
import { assert } from "../test-utils";
import { SugiLinkDatum, SugiNode, SugiNodeDatum } from "./sugify";

interface MutSugiNodeDatum<in out N, in out L> extends SugiNodeDatum<N, L> {
  node: MutGraphNode<N, L>;
}

interface MutSugiLinkDatum<in out N, in out L> extends SugiLinkDatum<N, L> {
  link: MutGraphLink<N, L>;
}

type MutSugiDatum<N, L> = MutSugiNodeDatum<N, L> | MutSugiLinkDatum<N, L>;

export function getLayers(dag: Graph<string>, numLayers: number): number[][] {
  const layers: number[][] = Array<null>(numLayers)
    .fill(null)
    .map(() => []);
  for (const node of dag.nodes()) {
    layers[node.y].push(parseInt(node.data));
  }
  for (const layer of layers) {
    layer.sort((a, b) => a - b);
  }
  return layers;
}

interface IndexDatum {
  index: number;
}

export function getIndex({ data }: SugiNode<IndexDatum>): number | null {
  return data.role === "node" ? data.node.data.index : null;
}

export interface TestDatum {
  layer: number;
  index: number;
}

export function createLayers(
  children: (number[] | number | bigint)[][]
): SugiNode<TestDatum, undefined>[][] {
  // easy checks
  assert(children.length);
  for (const first of children[0]) {
    assert(typeof first !== "number");
  }
  for (const last of children[children.length - 1]) {
    assert(typeof last === "object" && !last.length);
  }

  const orig: MutGraph<TestDatum, undefined> = graph();
  const sugi = graph<MutSugiDatum<TestDatum, undefined>, undefined>();
  const layers = children.map((layer) =>
    Array<MutGraphNode<MutSugiDatum<TestDatum, undefined>, undefined>>(
      layer.length
    )
  );

  // create original nodes and corresponding sugi nodes
  for (const [layer, layChildren] of children.entries()) {
    for (const [index, val] of layChildren.entries()) {
      if (typeof val === "object") {
        const node = orig.node({ layer, index });
        layers[layer][index] = sugi.node({
          role: "node",
          node,
          topLayer: layer,
          bottomLayer: layer,
        });
      }
    }
  }

  // replicate nodes upward
  for (const [ilay, layChildren] of entries(reverse(children))) {
    const layer = children.length - ilay;
    for (const [index, child] of layChildren.entries()) {
      if (typeof child === "bigint") {
        const lay = layer - 1;
        // TODO remove number cast when ts is upgraded
        const sugi = layers[layer][Number(child)];
        const { data } = sugi;
        assert(data.role === "node");
        data.topLayer = lay;
        layers[lay][index] = sugi;
      }
    }
  }

  // create dummy nodes
  // NOTE copy nodes because order will change as links are added
  for (const node of [...orig.nodes()]) {
    const { layer, index } = node.data;
    const sugiSource = layers[layer][index];
    const inds = children[layer][index];
    const initLayer = layer;
    assert(typeof inds === "object");
    for (let index of inds) {
      let lay = initLayer + 1;
      let next;
      const queue = [];
      while (typeof (next = children[lay][index]) === "number") {
        queue.push(index);
        lay++;
        index = next;
      }
      const sugiTarget = layers[lay][index];
      assert(sugiTarget.data.role === "node");
      const target = sugiTarget.data.node;
      const link = node.child(target, undefined);

      let last = sugiSource;
      lay = initLayer + 1;
      for (const index of queue) {
        const sug = sugi.node({ link, layer: lay, role: "link" });
        layers[lay][index] = sug;
        last.child(sug, undefined);
        last = sug;
        lay++;
      }
      last.child(sugiTarget, undefined);
    }
  }

  // set y
  for (const [y, layer] of layers.entries()) {
    for (const node of layer) {
      node.y = y;
    }
  }

  return layers;
}

/** return true if there are any compact crossings */
export function compactCrossings(
  topLayer: readonly SugiNode[],
  bottomLayer: readonly SugiNode[]
): boolean {
  // compute partition of compact and non-compact nodes
  const bottomInds = new Map(map(bottomLayer, (node, i) => [node, i]));
  const scan = [];
  const cross = [];
  for (const [i, node] of topLayer.entries()) {
    const ind = bottomInds.get(node);
    if (ind === undefined) {
      scan.push([i, node] as const);
    } else {
      cross.push([i, ind] as const);
    }
  }
  // go over all children and see if they cross
  for (const [i, node] of scan) {
    for (const [t, b] of cross) {
      const topOrd = i < t;
      for (const child of node.children()) {
        const ci = bottomInds.get(child)!;
        if (topOrd !== ci < b) {
          return true;
        }
      }
    }
  }
  return false;
}

export const nodeSep = (a: unknown, b: unknown) => (+!!a + +!!b) / 2;

/** canonical order for test nodes */
export function canonical<L>(grf: Graph<string, L>): GraphNode<string, L>[] {
  const arr = [...grf.nodes()];
  arr.sort((a, b) => parseInt(a.data) - parseInt(b.data));
  return arr;
}
