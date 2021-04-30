// TODO turn this into an operator for zherebko

import { DagNode } from "../dag/node";

function firstAvailable(inds: number[], target: number) {
  const index = inds.findIndex((i) => i <= target);
  if (index >= 0) {
    return index;
  } else {
    return inds.length;
  }
}

export function greedy<NodeType extends DagNode & { layer: number }>(
  nodes: NodeType[]
): Map<DagNode, Map<DagNode, number>> {
  const links = [];
  for (const node of nodes) {
    for (const child of node.ichildren()) {
      if (child.layer > node.layer + 1) {
        links.push([node, child] as const);
      }
    }
  }
  links.sort(([asrc, atgt], [bsrc, btgt]) =>
    atgt.layer === btgt.layer
      ? bsrc.layer - asrc.layer
      : atgt.layer - btgt.layer
  );

  const indices = new Map<NodeType, Map<NodeType, number>>();
  const pos: number[] = [];
  const neg: number[] = [];

  for (const [node, child] of links) {
    let targets = indices.get(node);
    if (targets === undefined) {
      targets = new Map();
      indices.set(node, targets);
    }

    const negIndex = firstAvailable(neg, node.layer);
    const posIndex = firstAvailable(pos, node.layer);
    if (negIndex < posIndex) {
      // TODO use index or something else to alternate tiebreaking?
      // tie-break right
      targets.set(child, -negIndex - 1);
      neg[negIndex] = child.layer - 1;
    } else {
      targets.set(child, posIndex + 1);
      pos[posIndex] = child.layer - 1;
    }
  }

  return indices;
}
