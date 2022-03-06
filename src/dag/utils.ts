import { DagNode, Dag } from ".";
import { listMultimapPush } from "../utils";
import { map } from "../iters";

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

/** convert a dag into a dot string */
export function dot<N, L>(
  dag: Dag<N, L>,
  id: (node: DagNode<N, L>) => string
): string {
  const links = [
    ...map(
      dag.ilinks(),
      ({ source, target }) => `    "${id(source)}" -> "${id(target)}"`
    )
  ];
  return `digraph {\n${links.join("\n")}\n}`;
}
