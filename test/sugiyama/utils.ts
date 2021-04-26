import {
  ChildLink,
  Dag,
  DagNode,
  LayoutChildLink,
  LayoutDagNode
} from "../../src/dag/node";

import { LayerableNode } from "../../src/sugiyama/layering";
import { SugiDummyNode } from "../../src";
import { def } from "../../src/utils";

export function toLayers<N extends DagNode<{ id: string }> & LayerableNode>(
  dag: Dag<N>
): number[][] {
  // TODO Require last layer is fully specified with empty nodes
  const layers: number[][] = [];
  for (const node of dag) {
    const layerId = node.layer;
    if (layerId === undefined) {
      throw new Error(`node with id '${node.data.id}' was not given a layer`);
    }
    const layer = layers[layerId] || (layers[layerId] = []);
    layer.push(parseInt(node.data.id));
  }
  for (const [i, layer] of layers.entries()) {
    if (layer === undefined) {
      throw new Error(`layer ${i} was empty`);
    }
  }
  return layers.map((layer) => layer.sort());
}

export class TestNode extends LayoutDagNode<
  { layer: number; index: number },
  undefined
> {
  x?: number;

  constructor(layer: number, index: number) {
    super({ layer, index });
  }
}

function iter(ids: number | number[]): number[] {
  return typeof ids === "number" ? [ids] : ids;
}

/** create layers for test dag */
export function createLayers(
  children: (number[] | number)[][]
): (TestNode | SugiDummyNode)[][] {
  const result = children.map((clayer, i) =>
    clayer.map((cval, j) =>
      typeof cval === "number" ? new SugiDummyNode() : new TestNode(i, j)
    )
  );
  const lastLayer = children[children.length - 1];
  if (lastLayer === undefined) {
    throw new Error("must pass at least one layer of children");
  }
  const lastIds = new Set<number>();
  for (const node of lastLayer) {
    for (const child of iter(node)) {
      lastIds.add(child);
    }
  }
  if (![...lastIds].every((_, i) => lastIds.has(i))) {
    throw new Error(`child ids must be ascending from zero but got ${lastIds}`);
  }
  result.push([...lastIds].map((_, j) => new TestNode(children.length, j)));

  for (const [i, nodes] of children.entries()) {
    const currentLayer = def(result[i]);
    const nextLayer = def(result[i + 1]);

    for (const [j, childIds] of nodes.entries()) {
      const node = def(currentLayer[j]);
      const newChildren = [
        ...iter(childIds).map(
          (id) => new LayoutChildLink(def(nextLayer[id]), undefined)
        )
      ];
      // There's no good way to fool this because dummy nodes inherently break
      // type safety
      node.dataChildren = newChildren as
        | ChildLink<undefined, SugiDummyNode>[]
        | ChildLink<undefined, TestNode>[];
    }
  }

  return result;
}

export function nodeSize(): [number, number] {
  return [1, 1];
}

export function crossings<NodeType extends DagNode>(
  layers: NodeType[][]
): number {
  let crossings = 0;
  let [topLayer, ...restLayers] = layers;
  for (const bottomLayer of restLayers) {
    const inds = new Map<NodeType, number>(
      bottomLayer.map((node, j) => [node, j])
    );
    for (const [j, p1] of topLayer.entries()) {
      for (const p2 of topLayer.slice(j + 1)) {
        for (const c1 of p1.ichildren()) {
          for (const c2 of p2.ichildren()) {
            if (c1 !== c2 && def(inds.get(c1)) > def(inds.get(c2))) {
              crossings++;
            }
          }
        }
      }
    }
    topLayer = bottomLayer;
  }
  return crossings;
}
