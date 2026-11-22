/**
 * self loop drawing
 *
 * @internal
 * @packageDocumentation
 */
import type { Graph, GraphLink, GraphNode } from "./graph/index.js";
import { entries } from "./iters.js";

/**
 * how far above and below a node's center its outermost self loop reaches
 *
 * Loops stay inside half the gap so they never meet loops on the next node.
 */
function loopReach(height: number, gap: number, outerDepth: number): number {
  return height / 2 + (gap * outerDepth) / (2 * (outerDepth + 1));
}

/** get how many of a node's self loops go on one side, the right taking the odd one */
export function loopsOnSide(total: number, onRight: boolean): number {
  const numLeft = Math.floor(total / 2);
  return onRight ? total - numLeft : numLeft;
}

/**
 * draw one self loop beside its node
 *
 * The loop leaves below the node's center, runs up beside it, and comes back
 * in above, so it starts and ends at the node's center like any other link.
 * Rise over distance grows with depth, so loops on one side stay nested, and
 * the outermost rises exactly its reach.
 *
 * @param onRight - whether the loop is on the node's right
 * @param depth - the loop's place out from the node, starting at 1
 * @param outerDepth - the depth of the outermost loop on the loop's side
 * @param size - the node's width and height
 * @param step - the space between nested loops
 * @param gap - the space between nodes above and below
 */
export function drawLoop<N, L>(
  link: GraphLink<N, L>,
  onRight: boolean,
  depth: number,
  outerDepth: number,
  [width, height]: readonly [number, number],
  step: number,
  gap: number,
): void {
  const { source: node, points } = link;
  const half = width / 2;
  const dist = half + depth * step;
  const outer = half + outerDepth * step;
  const rise =
    (loopReach(height, gap, outerDepth) / (2 * outerDepth)) *
    (depth + outerDepth) *
    (outer ? dist / outer : 1);
  const loopX = node.x + (onRight ? dist : -dist);
  points.splice(0);
  points.push(
    [node.x, node.y],
    [loopX, node.y + rise],
    [loopX, node.y - rise],
    [node.x, node.y],
  );
}

/**
 * draw a node's self loops, alternating right and left, nested a step apart
 * outside its width
 *
 * @param size - the node's width and height
 * @param step - the space between nested loops
 * @param gap - the space between nodes above and below
 */
export function drawLoops<N, L>(
  node: GraphNode<N, L>,
  size: readonly [number, number],
  step: number,
  gap: number,
): void {
  const total = node.nchildLinksTo(node);
  for (const [ind, link] of entries(node.childLinksTo(node))) {
    const onRight = ind % 2 === 0;
    const depth = Math.floor(ind / 2) + 1;
    const outerDepth = loopsOnSide(total, onRight);
    drawLoop(link, onRight, depth, outerDepth, size, step, gap);
  }
}

/**
 * move a layout down to fit self loops that reach above it
 *
 * @returns the height that also fits loops that reach below it
 */
export function fitLoops(grf: Graph, height: number): number {
  let top = 0;
  let bottom = height;
  for (const node of grf.nodes()) {
    for (const { points } of node.childLinksTo(node)) {
      for (const [, y] of points) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (top < 0) {
    for (const node of grf.nodes()) {
      node.y -= top;
    }
    for (const { points } of grf.links()) {
      for (const point of points) {
        point[1] -= top;
      }
    }
  }
  return bottom - top;
}
