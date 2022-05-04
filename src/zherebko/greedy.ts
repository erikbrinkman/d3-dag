/**
 * Until this is customizable, this is an internal module
 *
 * @internal
 * @packageDocumentation
 */
// TODO turn this into an operator for zherebko
import { DagNode } from "../dag";
import { entries } from "../iters";

function firstAvailable(inds: number[], target: number) {
  const index = inds.findIndex((i) => i <= target);
  if (index >= 0) {
    return index;
  } else {
    return inds.length;
  }
}

/**
 * @returns link map which takes source, target, and ind to get lane
 */
export function greedy(
  nodes: readonly (readonly [DagNode, number])[]
): Map<DagNode, number[]> {
  // We first create an array of every link we want to render, with the layer
  // of their source and target node so that we can sort first by target layer
  // then by source layer to greedily assign lanes so they don't intersect
  const layers = new Map(nodes);
  const links = [];
  for (const [i, [node, nodeLayer]] of nodes.entries()) {
    // here we don't include a link if it's to the next node in the stack, and
    // if it's the first time we've seen that node among this node's children.
    let seen = false;
    const next = nodes[i + 1]?.[0];
    for (const [index, { target }] of entries(node.ichildLinks())) {
      const childLayer = layers.get(target)!;
      if (next === target && !seen) {
        seen = true; // skip the first time
      } else {
        links.push([nodeLayer, childLayer, node, index] as const);
      }
    }
  }
  links.sort(([asrcl, atgtl], [bsrcl, btgtl]) =>
    atgtl === btgtl ? bsrcl - asrcl : atgtl - btgtl
  );

  const indices = new Map<DagNode, number[]>();
  const pos: number[] = [];
  const neg: number[] = [];

  for (const [nodeLayer, childLayer, node, linkIndex] of links) {
    let targets = indices.get(node);
    if (targets === undefined) {
      targets = [];
      indices.set(node, targets);
    }

    const negIndex = firstAvailable(neg, nodeLayer);
    const posIndex = firstAvailable(pos, nodeLayer);
    if (negIndex < posIndex) {
      // TODO tiebreak with crossing for insertion
      // NOTE there may not be a better layout than this, so this may not need
      // to be an operator if we can solve this aspect.
      // tie-break right
      targets[linkIndex] = -negIndex - 1;
      neg[negIndex] = childLayer - 1;
    } else {
      targets[linkIndex] = posIndex + 1;
      pos[posIndex] = childLayer - 1;
    }
  }

  return indices;
}
