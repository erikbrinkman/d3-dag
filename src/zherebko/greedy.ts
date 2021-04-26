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
  const indices = new Map<NodeType, Map<NodeType, number>>();
  const pos: number[] = [];
  const neg: number[] = [];

  for (const node of nodes) {
    const targets = new Map();
    indices.set(node, targets);
    for (const child of node.children().sort((a, b) => a.layer - b.layer)) {
      if (child.layer > node.layer + 1) {
        const negIndex = firstAvailable(neg, node.layer);
        const posIndex = firstAvailable(pos, node.layer);
        if (negIndex < posIndex) {
          // tie-break right
          targets.set(child, -negIndex - 1);
          neg[negIndex] = child.layer - 1;
        } else {
          targets.set(child, posIndex + 1);
          pos[posIndex] = child.layer - 1;
        }
      }
    }
  }

  return indices;
}
