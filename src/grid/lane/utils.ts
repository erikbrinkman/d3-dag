import { setEqual } from "../../collections";
import { GraphNode } from "../../graph";
import { chain, filter, map, slice } from "../../iters";
import { berr } from "../../utils";

/** the effective children for grid layouts */
export function gridChildren(node: GraphNode): Set<GraphNode> {
  return new Set(
    filter(chain(node.children(), node.parents()), (other) => other.y > node.y)
  );
}

/**
 * Verify that nodes were assigned valid lanes
 */
export function verifyLanes(
  ordered: GraphNode[],
  lane?: string | undefined
): number {
  for (const node of ordered) {
    if (node.ux === undefined) {
      throw berr`lane ${lane} didn't assign an x to every node`;
    } else if (node.x < 0) {
      throw berr`lane ${lane} assigned an x less than 0: ${node.x}`;
    }
  }

  const uniqueExes = new Set(ordered.map((node) => node.x));
  if (!setEqual(uniqueExes, new Set(map(uniqueExes, (_, i) => i)))) {
    const exStr = [...uniqueExes].sort((a, b) => a - b).join(", ");
    throw berr`lane ${lane} didn't assign increasing positive integers for x coordinates: ${exStr}`;
  }

  const parentIndex = new Map<GraphNode, number>();
  for (const [ind, node] of ordered.entries()) {
    // test that no nodes overlap with edges
    const topIndex = parentIndex.get(node);
    if (topIndex !== undefined) {
      for (const above of slice(ordered, topIndex + 1, ind)) {
        if (above.x === node.x) {
          throw berr`lane ${lane} assigned nodes to an overlapping lane: ${node.x}`;
        }
      }
    }

    // update parent index
    for (const child of node.children()) {
      if (!parentIndex.has(child)) {
        parentIndex.set(child, ind);
      }
    }
  }

  return uniqueExes.size;
}
