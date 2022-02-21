import { DagNode } from ".";
import { listMultimapPush } from "../utils";

export function getParents<N, L>(
  parentNodes: Iterable<DagNode<N, L>>
): Map<DagNode<N, L>, DagNode<N, L>[]> {
  const parents = new Map<DagNode<N, L>, DagNode<N, L>[]>();
  for (const par of parentNodes) {
    for (const child of par.ichildren()) {
      listMultimapPush(parents, child, par);
    }
  }
  return parents;
}
