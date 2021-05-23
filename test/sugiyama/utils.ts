import {
  ChildLink,
  Dag,
  DagNode,
  LayoutChildLink,
  LayoutDagNode
} from "../../src/dag/node";
import { bigrams, def } from "../../src/utils";

import { DummyNode } from "../../src/sugiyama/dummy";

export function toLayers(dag: Dag<{ id: string }>): number[][] {
  // TODO Require last layer is fully specified with empty nodes
  const layers: number[][] = [];
  for (const node of dag) {
    const layerId = def(
      node.value,
      `node with id '${node.data.id}' was not given a layer`
    );
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

function iter(ids: number | number[]): number[] {
  return typeof ids === "number" ? [ids] : ids;
}

export interface TestDatum {
  layer: number;
  index: number;
}

/** create layers for test dag */
export function createLayers(
  children: (number[] | number)[][]
): (DagNode<TestDatum> | DummyNode)[][] {
  const result = children.map((clayer, i) =>
    clayer.map((cval, j) =>
      typeof cval === "number"
        ? new DummyNode()
        : new LayoutDagNode({ layer: i, index: j })
    )
  );
  const lastLayer = children[children.length - 1];
  if (lastLayer === undefined) {
    throw new Error("must pass at least one layer of children");
  }
  const maxLastId = Math.max(
    ...lastLayer.map((node) => Math.max(...iter(node)))
  );
  if (maxLastId < 0) {
    throw new Error("invalid last layer ids");
  }
  result.push(
    new Array(maxLastId + 1)
      .fill(null)
      .map((_, j) => new LayoutDagNode({ layer: children.length, index: j }))
  );

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
        | ChildLink<undefined, undefined>[]
        | ChildLink<TestDatum, undefined>[];
    }
  }

  return result;
}

export const nodeSize = () => [1, 1] as const;

export function crossings(layers: readonly (readonly DagNode[])[]): number {
  let crossings = 0;
  for (const [topLayer, bottomLayer] of bigrams(layers)) {
    const inds = new Map(bottomLayer.map((node, j) => [node, j] as const));
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
  }
  return crossings;
}
