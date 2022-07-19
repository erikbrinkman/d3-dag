import FastPriorityQueue from "fastpriorityqueue";
import { Dag, DagNode } from ".";
import { map } from "../iters";
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

/** get the id from a dag node */
export interface IdAccessor<N, L> {
  (node: DagNode<N, L>): string;
}

/** convert a dag into a dot string */
export function dot<N, L>(dag: Dag<N, L>, id: IdAccessor<N, L>): string {
  const links = [
    ...map(
      dag.ilinks(),
      ({ source, target }) => `    "${id(source)}" -> "${id(target)}"`
    ),
  ];
  return `digraph {\n${links.join("\n")}\n}`;
}

/** a node prioritization function */
export interface Prioritization<N, L> {
  (node: DagNode<N, L>): number | undefined;
}

/**
 * iterate over nodes in a dag
 *
 * Parents will be returned before children. Nodes without priority will be
 * returned first, then nodes with the lowest priority.
 */
export function* before<N, L>(
  dag: Dag<N, L>,
  priority: Prioritization<N, L>
): IterableIterator<DagNode<N, L>> {
  const numBefore = new Map<DagNode, number>();
  for (const node of dag) {
    for (const child of node.ichildren()) {
      numBefore.set(child, (numBefore.get(child) || 0) + 1);
    }
  }

  const prioritized = new FastPriorityQueue<[DagNode<N, L>, number]>(
    ([, a], [, b]) => a < b
  );
  const unprioritized: DagNode<N, L>[] = [];

  function push(node: DagNode<N, L>): void {
    const pri = priority(node);
    if (pri === undefined) {
      unprioritized.push(node);
    } else {
      prioritized.add([node, pri]);
    }
  }

  for (const node of dag.iroots()) {
    push(node);
  }

  let node;
  while ((node = unprioritized.pop() ?? prioritized.poll()?.[0])) {
    yield node;
    for (const child of node.ichildren()) {
      const before = numBefore.get(child)!;
      if (before > 1) {
        numBefore.set(child, before - 1);
      } else {
        push(child);
      }
    }
  }
}
