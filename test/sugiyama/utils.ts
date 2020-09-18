import {
  Dag,
  DagNode,
  LayoutChildLink,
  LayoutDagNode
} from "../../src/dag/node";
import { SafeMap, def } from "../../src/utils";

import { LayerableNode } from "../../src/sugiyama/layering";
import { SugiDummyNode } from "../../src";

export function toLayers<N extends DagNode & LayerableNode>(
  dag: Dag<N>
): number[][] {
  // TODO Require last layer is fully specified with empty nodes
  const layers: number[][] = [];
  for (const node of dag) {
    const layerId = node.layer;
    if (layerId === undefined) {
      throw new Error(`node with id ${node.id} was not given a layer`);
    }
    const layer = layers[layerId] || (layers[layerId] = []);
    layer.push(parseInt(node.id));
  }
  for (const [i, layer] of layers.entries()) {
    if (layer === undefined) {
      throw new Error(`layer ${i} was empty`);
    }
  }
  return layers.map((layer) => layer.sort());
}

class TestNode extends LayoutDagNode<undefined, undefined> {
  x?: number;

  constructor(id: string) {
    super(id, undefined);
  }
}

function iter(ids: number | number[]): number[] {
  return typeof ids === "number" ? [ids] : ids;
}

export function createLayers(
  children: (number[] | number)[][]
): (TestNode | SugiDummyNode)[][] {
  const result = children.map((clayer, i) =>
    clayer.map((cval, j) =>
      typeof cval === "number"
        ? new SugiDummyNode(`${i},${j}`)
        : new TestNode(`${i},${j}`)
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
  result.push(
    [...lastIds].map((_, j) => new TestNode(`${children.length},${j}`))
  );

  children.forEach((nodes, i) => {
    const currentLayer = def(result[i]);
    const nextLayer = def(result[i + 1]);

    nodes.forEach((childIds, j) => {
      const node = def(currentLayer[j]);
      for (const id of iter(childIds)) {
        const child = nextLayer[id];
        if (child === undefined) {
          throw new Error(
            `each child id must correspond to a node in the next layer`
          );
        }
        node.dataChildren.push(new LayoutChildLink(child, undefined));
      }
    });
  });

  return result;
}

export function sep(): number {
  return 1;
}

export function crossings<NodeType extends DagNode>(
  layers: NodeType[][]
): number {
  let crossings = 0;
  let [topLayer, ...restLayers] = layers;
  for (const bottomLayer of restLayers) {
    const inds = new SafeMap<string, number>(
      bottomLayer.map((node, j) => [node.id, j])
    );
    for (const [j, p1] of topLayer.entries()) {
      for (const p2 of topLayer.slice(j + 1)) {
        for (const c1 of p1.ichildren()) {
          for (const c2 of p2.ichildren()) {
            if (c1 !== c2 && inds.getThrow(c1.id) > inds.getThrow(c2.id)) {
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
