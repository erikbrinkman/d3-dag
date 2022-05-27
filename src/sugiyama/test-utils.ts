/**
 * utilities for testing
 *
 * @internal
 * @packageDocumentation
 */
import { Graph, graph, MutGraph, MutGraphNode } from "../graph";
import { assert } from "../test-utils";
import { MutSugiNode, SugiDatum, SugiNode } from "./sugify";

export function getLayers(dag: Graph<string>, numLayers: number): number[][] {
  const layers: number[][] = Array<null>(numLayers)
    .fill(null)
    .map(() => []);
  for (const node of dag) {
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

export function getIndex(node: SugiNode<IndexDatum>): number | undefined {
  return "node" in node.data ? node.data.node.data.index : undefined;
}

export interface TestDatum {
  layer: number;
  index: number;
}

export function createLayers(
  children: (number[] | number)[][]
): SugiNode<TestDatum, undefined>[][] {
  // easy checks
  assert(children.length);
  for (const first of children[0]) {
    assert(typeof first !== "number");
  }
  for (const last of children[children.length - 1]) {
    assert(typeof last !== "number" && !last.length);
  }

  const orig: MutGraph<TestDatum, undefined> = graph();
  const mapping = new Map<string, MutGraphNode<TestDatum, undefined>>();
  const sugi = graph<SugiDatum<TestDatum, undefined>, undefined>();
  const layers = children.map((layer) =>
    Array<MutSugiNode<TestDatum, undefined>>(layer.length)
  );
  for (const [layer, layChildren] of children.entries()) {
    for (const [index, val] of layChildren.entries()) {
      if (typeof val !== "number") {
        const node = orig.node({ layer, index });
        mapping.set(`${layer} ${index}`, node);
        layers[layer][index] = sugi.node({ node, layer });
      }
    }
  }

  for (const node of [...orig]) {
    const { layer, index } = node.data;
    const sugiSource = layers[layer][index];
    const inds = children[layer][index];
    const initLayer = layer;
    assert(typeof inds !== "number");
    for (let index of inds) {
      let lay = initLayer + 1;
      let next;
      const queue = [];
      while (typeof (next = children[lay][index]) === "number") {
        queue.push(index);
        lay++;
        index = next;
      }
      const target = mapping.get(`${lay} ${index}`);
      const sugiTarget = layers[lay][index];
      assert(target !== undefined);
      const link = node.child(target, undefined);

      let last = sugiSource;
      lay = initLayer + 1;
      for (const index of queue) {
        const sug = sugi.node({ link, layer: lay });
        layers[lay][index] = sug;
        last.child(sug, undefined);
        last = sug;
        lay++;
      }
      last.child(sugiTarget, undefined);
    }
  }

  return layers;
}

export const nodeSep = (a: unknown, b: unknown) => (+!!a + +!!b) / 2;
