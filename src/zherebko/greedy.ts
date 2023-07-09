/**
 * Until this is customizable, this is an internal module
 *
 * @internal
 * @packageDocumentation
 */
// TODO turn this into an operator for zherebko
import { GraphLink, GraphNode } from "../graph";
import { bigrams } from "../iters";

function* zhereParentLinks(
  node: GraphNode,
): IterableIterator<[GraphNode, GraphNode, GraphLink]> {
  for (const link of node.parentLinks()) {
    const { source } = link;
    if (source.y < node.y) {
      yield [source, node, link];
    }
  }
  for (const link of node.childLinks()) {
    const { target } = link;
    if (target.y < node.y) {
      yield [target, node, link];
    }
  }
}

function firstAvailable(inds: number[], target: number) {
  const index = inds.findIndex((i) => i < target);
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
  nodes: readonly GraphNode[],
  gap: number,
): Map<GraphLink, number> {
  // We first create an array of every link we want to render, with the layer
  // of their source and target node so that we can sort first by target layer
  // then by source layer to greedily assign lanes so they don't intersect
  const links = [];
  for (const [last, node] of bigrams(nodes)) {
    let seen = false;
    for (const info of zhereParentLinks(node)) {
      const [source] = info;
      if (last === source && !seen) {
        seen = true;
      } else {
        links.push(info);
      }
    }
  }

  links.sort(([fs, ft], [ss, st]) => ft.y - st.y || ss.y - fs.y);

  const pos: number[] = [];
  const neg: number[] = [];

  const indices = new Map<GraphLink, number>();
  for (const [source, target, link] of links) {
    // we can technically put the gap both in the query and the save, but this
    // allows a little floating point tolerance.
    const negIndex = firstAvailable(neg, source.y);
    const posIndex = firstAvailable(pos, source.y);
    if (negIndex < posIndex) {
      // TODO tiebreak with crossing for insertion
      // NOTE there may not be a better layout than this, so this may not need
      // to be an operator if we can solve this aspect.
      // tie-break right
      indices.set(link, -negIndex - 1);
      neg[negIndex] = target.y - gap;
    } else {
      indices.set(link, posIndex + 1);
      pos[posIndex] = target.y - gap;
    }
  }
  return indices;
}
