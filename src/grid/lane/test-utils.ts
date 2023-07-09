/**
 * @internal
 * @packageDocumentation
 */
import { Graph, GraphNode } from "../../graph";
import { graphConnect } from "../../graph/connect";
import { ConnectGraph } from "../../test-graphs";

/** a dag where greedy doesn't minimize crossings */
export function hard(): ConnectGraph {
  const build = graphConnect();
  return build([
    ["0", "1"],
    ["0", "2"],
    ["0", "3"],
    ["0", "4"],
    ["1", "4"],
  ]);
}

/** puts nodes in numeric id order, verifying it's also topological */
export function prepare(grf: Graph<string>): GraphNode<string, unknown>[] {
  const nodes: GraphNode<string, unknown>[] = Array<GraphNode<string, unknown>>(
    grf.nnodes(),
  );
  for (const node of grf.nodes()) {
    const y = parseInt(node.data);
    node.y = y;
    nodes[y] = node;
  }
  return nodes;
}

/** compute the number of edge crossings */
export function crossings(ordered: GraphNode[]): number {
  let crossings = 0;
  const parentIndex = new Map<GraphNode, number>();
  for (const [ind, node] of ordered.entries()) {
    const topIndex = parentIndex.get(node);
    if (topIndex !== undefined) {
      // have the potential for crossings
      for (const above of ordered.slice(topIndex + 1, ind)) {
        for (const child of above.children()) {
          if (
            (above.x > node.x && child.x < node.x) ||
            (above.x < node.x && child.x > node.x)
          ) {
            crossings++;
          }
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
  return crossings;
}
