import { DagNode } from ".";
import { listMultimapPush } from "../utils";

/**
 * get a mapping from a the children of a set of nodes to their unique parents
 */
export function getParents<N, L>(
  parentNodes: Iterable<DagNode<N, L>>
): Map<DagNode<N, L>, DagNode<N, L>[]> {
  const parents = new Map();
  for (const par of parentNodes) {
    for (const child of par.ichildren()) {
      listMultimapPush(parents, child, par);
    }
  }
  return parents;
}

/**
 * get a mapping from a the children of a set of nodes to their parents with counts
 */
export function getParentCounts<N, L>(
  parentNodes: Iterable<DagNode<N, L>>
): Map<DagNode<N, L>, [DagNode<N, L>, number][]> {
  const parents = new Map();
  for (const par of parentNodes) {
    for (const [child, count] of par.ichildrenCounts()) {
      listMultimapPush(parents, child, [par, count]);
    }
  }
  return parents;
}
