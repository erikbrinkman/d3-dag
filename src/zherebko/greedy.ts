// TODO turn this into an operator for zherebko

import { DagNode } from "../dag/node";
import { def } from "../utils";

function firstAvailable(inds: number[], target: number) {
  const index = inds.findIndex((i) => i <= target);
  if (index >= 0) {
    return index;
  } else {
    return inds.length;
  }
}

export function greedy(nodes: DagNode[]): Map<DagNode, Map<DagNode, number>> {
  const layers = new Map(nodes.map((n, i) => [n, i] as const));
  const links = [];
  for (const [nodeLayer, node] of nodes.entries()) {
    for (const child of node.ichildren()) {
      const childLayer = def(layers.get(child));
      if (childLayer > nodeLayer + 1) {
        links.push([node, nodeLayer, child, childLayer] as const);
      }
    }
  }
  links.sort(([, asrcl, , atgtl], [, bsrcl, , btgtl]) =>
    atgtl === btgtl ? bsrcl - asrcl : atgtl - btgtl
  );

  const indices = new Map<DagNode, Map<DagNode, number>>();
  const pos: number[] = [];
  const neg: number[] = [];

  for (const [node, nodeLayer, child, childLayer] of links) {
    let targets = indices.get(node);
    if (targets === undefined) {
      targets = new Map();
      indices.set(node, targets);
    }

    const negIndex = firstAvailable(neg, nodeLayer);
    const posIndex = firstAvailable(pos, nodeLayer);
    if (negIndex < posIndex) {
      // TODO tiebreak with crossing for insertion
      // tie-break right
      targets.set(child, -negIndex - 1);
      neg[negIndex] = childLayer - 1;
    } else {
      targets.set(child, posIndex + 1);
      pos[posIndex] = childLayer - 1;
    }
  }

  return indices;
}
