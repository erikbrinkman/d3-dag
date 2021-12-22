import { Dag, DagNode } from "../../../src/dag";
import { connect, ConnectDatum } from "../../../src/dag/create";
import { assert } from "../../../src/utils";
import { SimpleLinkDatum } from "../../examples";

/** a dag where greedy doesn't minimize crossings */
export function hard(): Dag<ConnectDatum, SimpleLinkDatum> {
  return connect()([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["0", "4"],
    ["1", "4"]
  ]);
}

/** verifies if an array of nodes is in topological order */
function isTopological(nodes: DagNode[]): boolean {
  const seen = new Set<DagNode>();
  for (const node of nodes) {
    seen.add(node);
    for (const child of node.ichildren()) {
      if (seen.has(child)) {
        return false;
      }
    }
  }
  return true;
}

/** puts nodes in numeric id order, verifying it's also topological */
export function prepare(dag: Dag<{ id: string }>): DagNode<{ id: string }>[] {
  const nodes = [...dag].sort(
    (a, b) => parseInt(a.data.id) - parseInt(b.data.id)
  );
  if (!isTopological(nodes)) {
    throw new Error("ids weren't in topological order");
  }
  for (const [i, node] of nodes.entries()) {
    node.y = i;
  }
  return nodes;
}

/** compute the number of edge crossings */
export function crossings(ordered: DagNode[]): number {
  let crossings = 0;
  const parentIndex = new Map<DagNode, number>();
  for (const [ind, node] of ordered.entries()) {
    const topIndex = parentIndex.get(node);
    if (topIndex !== undefined) {
      assert(node.x !== undefined);
      // have the potential for crossings
      for (const above of ordered.slice(topIndex + 1, ind)) {
        assert(above.x !== undefined);
        for (const child of above.ichildren()) {
          assert(child.x !== undefined);
          if (
            (above.x > node.x && child.x < node.x) ||
            (above.x < node.x && child.x > node.x)
          ) {
            crossings += 1;
          }
        }
      }
    }

    // update parent index
    for (const child of node.ichildren()) {
      if (!parentIndex.has(child)) {
        parentIndex.set(child, ind);
      }
    }
  }
  return crossings;
}
