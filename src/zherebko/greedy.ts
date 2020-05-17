// TODO turn this into an operator for zherebko
// TODO Add debug option for link indices

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
): Map<string, number> {
  const indices = new Map<string, number>();
  const pos: number[] = [];
  const neg: number[] = [];

  for (const node of nodes) {
    for (const child of node.children().sort((a, b) => a.layer - b.layer)) {
      const linkId = `${node.id}\0${child.id}`;
      if (child.layer > node.layer + 1) {
        const negIndex = firstAvailable(neg, node.layer);
        const posIndex = firstAvailable(pos, node.layer);
        if (negIndex < posIndex) {
          // tie-break right
          indices.set(linkId, -negIndex - 1);
          neg[negIndex] = child.layer - 1;
        } else {
          indices.set(linkId, posIndex + 1);
          pos[posIndex] = child.layer - 1;
        }
      }
    }
  }

  return indices;
}
