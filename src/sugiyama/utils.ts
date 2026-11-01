import type { GraphNode } from "../graph/index.js";
import { bigrams } from "../iters.js";
import type { NodeLength } from "../layout.js";

/**
 * A separation function that indicates how far apart nodes should be the layering / height assignment.
 *
 *
 * @remarks upper and lower are historic, since arbitrary graphs are handled,
 * there is no longer a notion of upper or lower and separation should return
 * the correct separation independent of nodes relations in the graph.
 */
export type Separation<in NodeDatum = never, in LinkDatum = never> = (
  first: GraphNode<NodeDatum, LinkDatum> | undefined,
  second: GraphNode<NodeDatum, LinkDatum> | undefined,
) => number;

/**
 * A separation derived from a length and a gap
 *
 * This is the separation function if each node has size `len` and between two
 * nodes there's an extra `gap`.
 */
export function sizedSeparation<NodeDatum, LinkDatum>(
  len: NodeLength<NodeDatum, LinkDatum>,
  gap: number,
): Separation<NodeDatum, LinkDatum> {
  function sizedSeparation(
    left: GraphNode<NodeDatum, LinkDatum> | undefined,
    right: GraphNode<NodeDatum, LinkDatum> | undefined,
  ): number {
    const llen = left ? len(left) : 0;
    const rlen = right ? len(right) : 0;
    const base = (llen + rlen) / 2;
    return left && right ? base + gap : base;
  }
  return sizedSeparation;
}

/** compute the number of crossings in a layered sugi node */
export function crossings(layers: readonly (readonly GraphNode[])[]): number {
  let crossings = 0;
  for (const [topLayer, bottomLayer] of bigrams(layers)) {
    const inds = new Map(bottomLayer.map((node, ind) => [node, ind] as const));
    // fenwick tree of link counts by bottom index, offset by one
    const tree = new Array<number>(bottomLayer.length + 1).fill(0);
    let total = 0;
    for (const node of topLayer) {
      const links = [...node.childCounts()].map(
        ([child, count]) => [inds.get(child)! + 1, count] as const,
      );
      // links sharing a parent never cross, so all are counted before any is added
      for (const [ind, count] of links) {
        let atMost = 0;
        for (let pos = ind; pos > 0; pos -= pos & -pos) {
          atMost += tree[pos];
        }
        crossings += count * (total - atMost);
      }
      for (const [ind, count] of links) {
        for (let pos = ind; pos < tree.length; pos += pos & -pos) {
          tree[pos] += count;
        }
        total += count;
      }
    }
  }
  return crossings;
}
