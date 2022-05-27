import { GraphNode } from "../graph";
import { bigrams } from "../iters";

/** An accessor for computing the length of a node */
export interface NodeLength<in NodeDatum = never, in LinkDatum = never> {
  (node: GraphNode<NodeDatum, LinkDatum>): number;
}

/**
 * A separation function that indicates how far apart nodes should be the layering / height assignment.
 *
 * Upper or lower are undefined to indicate the separation from the extents of
 * the layout (0, or height).
 *
 * @remarks upper and lower are historic, since arbitrary graphs are handled,
 * there is no longer a notion of upper or lower and separation should return
 * the correct separation independent of nodes relations in the graph.
 */
export interface Separation<in NodeDatum = never, in LinkDatum = never> {
  (
    upper: GraphNode<NodeDatum, LinkDatum> | undefined,
    lower: GraphNode<NodeDatum, LinkDatum> | undefined
  ): number;
}

/**
 * A separation derived from a length and a gap
 *
 * This is the separation function if each node has size `len` and between two
 * nodes there's an extra `gap`.
 */
export function sizedSeparation<NodeDatum, LinkDatum>(
  len: NodeLength<NodeDatum, LinkDatum>,
  gap: number
): Separation<NodeDatum, LinkDatum> {
  return (
    left: GraphNode<NodeDatum, LinkDatum> | undefined,
    right: GraphNode<NodeDatum, LinkDatum> | undefined
  ): number => {
    const llen = left ? len(left) : 0;
    const rlen = right ? len(right) : 0;
    const base = (llen + rlen) / 2;
    return left && right ? base + gap : base;
  };
}

/** compute the number of crossings in a layered sugi node */
export function crossings(layers: readonly (readonly GraphNode[])[]): number {
  let crossings = 0;
  for (const [topLayer, bottomLayer] of bigrams(layers)) {
    const inds = new Map(bottomLayer.map((node, j) => [node, j] as const));
    for (const [j, p1] of topLayer.entries()) {
      for (const p2 of topLayer.slice(j + 1)) {
        for (const [c1, n1] of p1.childCounts()) {
          for (const [c2, n2] of p2.childCounts()) {
            if (c1 !== c2 && inds.get(c1)! > inds.get(c2)!) {
              crossings += n1 * n2;
            }
          }
        }
      }
    }
  }
  return crossings;
}
