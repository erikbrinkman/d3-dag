/**
 * A {@link grid/lane!Lane} that assigns lanes greedily, but quickly.
 *
 * @packageDocumentation
 */
import { least, median } from "d3-array";
import { Lane } from ".";
import { GraphNode } from "../../graph";
import { map, slice } from "../../iters";
import { err } from "../../utils";
import { gridChildren } from "./utils";

/**
 * A lane operator that assigns lanes greedily, but quickly.
 *
 * Create with {@link laneGreedy}.
 *
 * @example
 *
 * A top down example
 * <img alt="grid example" src="media://grid-greedy-topdown.png" width="200">
 *
 * @example
 *
 * A bottom up example
 * <img alt="grid example" src="media://grid-greedy-bottomup.png" width="200">
 */
export interface LaneGreedy extends Lane<unknown, unknown> {
  /**
   * Set whether the greedy assignment should be top-down or bottom-up.
   * (default: true)
   */
  topDown(val: boolean): LaneGreedy;
  /**
   * Get whether the current operator is set to assign top-down..
   */
  topDown(): boolean;

  /**
   * Set whether to used compressed output
   *
   * If output is compressed a free lane will be chosen over minimizing edge
   * lengths. (default: true)
   */
  compressed(val: boolean): LaneGreedy;
  /** Get the current compressed setting */
  compressed(): boolean;

  /**
   * Set whether to assign bidirectional indices
   *
   * The first node will be assigned lane zero. If bidirectional, the lanes can
   * fan out in either direction from there, otherwise new lanes will always be
   * added to the right. (default: false)
   */
  bidirectional(val: boolean): LaneGreedy;
  /** Get the current bidirectional setting */
  bidirectional(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * an indexer for greedily picking a valid lane for a node
 *
 * @internal
 */
interface Indexer {
  /** get an index that's free at free, and optionally close to target */
  getIndex(free: number, target?: number): number;
  /** set index as being invalid up to upTo */
  setIndex(index: number, upTo: number): void;
  /** get the offset to add to indices so they start at 0 */
  offset(): number;
}

/**
 * an indexer that only assigns non-negatable indices
 *
 * @internal
 */
class OneSidedIndexer implements Indexer {
  private indices: number[] = [];

  constructor(readonly uncompressed: boolean) {}

  getIndex(after: number, target?: number): number {
    const free: number[] = [];
    for (const [i, val] of this.indices.entries()) {
      if (val <= after) {
        free.push(i);
      }
    }
    if (this.uncompressed) {
      free.push(this.indices.length);
    }
    const targ = target === undefined ? 0 : target;
    const ind =
      least(free, (v) => [Math.abs(targ - v), v]) ?? this.indices.length;
    this.setIndex(ind, after);
    return ind;
  }

  setIndex(index: number, upTo: number): void {
    this.indices[index] = upTo;
  }

  offset(): number {
    return 0;
  }
}

/**
 * an indexer that will assign positive and negative indices
 *
 * @internal
 */
class TwoSidedIndexer implements Indexer {
  // We use two arrays so that appends on either side are efficient
  private posIndices: number[] = [0];
  private negIndices: number[] = [];

  constructor(readonly uncompressed: boolean) {}

  /** the next negative index */
  nextNeg(): number {
    return -this.negIndices.length - 1;
  }

  /** the next positive index */
  nextPos(): number {
    return this.posIndices.length;
  }

  getIndex(after: number, target?: number): number {
    const free: number[] = [];
    for (const [i, val] of this.negIndices.entries()) {
      if (val <= after) {
        free.push(-i - 1);
      }
    }
    for (const [i, val] of this.posIndices.entries()) {
      if (val <= after) {
        free.push(i);
      }
    }
    if (this.uncompressed) {
      free.push(this.nextNeg());
      free.push(this.nextPos());
    }
    const targ = target === undefined ? 0 : target;
    const empty =
      this.negIndices.length < this.posIndices.length - 1
        ? this.nextNeg()
        : this.nextPos();
    // tie break on distance to target, then closest to zero, then positive
    const ind =
      least(free, (v) => [Math.abs(targ - v), Math.abs(v), -v]) ?? empty;
    this.setIndex(ind, after);
    return ind;
  }

  setIndex(index: number, upTo: number): void {
    if (index < 0) {
      this.negIndices[-index - 1] = upTo;
    } else {
      this.posIndices[index] = upTo;
    }
  }

  offset(): number {
    return this.negIndices.length;
  }
}

/**
 * create a new indexer
 *
 * @internal
 */
function indexer(compressed: boolean, bidirectional: boolean): Indexer {
  if (bidirectional) {
    return new TwoSidedIndexer(!compressed);
  } else {
    return new OneSidedIndexer(!compressed);
  }
}

/**
 * assign lanes based on top down approach
 *
 * This method assigns lanes to each of nodes children as soon as it finds
 * them, giving the farthest away children lanes first.
 *
 * @internal
 */
function topDownOp(nodes: readonly GraphNode[], inds: Indexer): void {
  // if node is new (no children) give it an arbitrary index
  for (const node of nodes) {
    if (node.ux === undefined) {
      node.x = inds.getIndex(node.y);
    }

    // iterate over children from farthest away to closest, assign each a lane
    // in order, trying to be as close to their parent as possible
    for (const child of [...gridChildren(node)].sort((a, b) => b.y - a.y)) {
      if (child.ux === undefined) {
        child.x = inds.getIndex(node.y, node.x);
        inds.setIndex(child.x, child.y);
      }
    }
  }

  // update according to offset
  const offset = inds.offset();
  for (const node of nodes) {
    node.x += offset;
  }
}

/**
 * assign lanes based on bottom up approach
 *
 * This method assigns a nodes highest parent the same lane as it, and
 * otherwise defers from assigning lanes.
 *
 * @internal
 */
function bottomUpOp(nodes: readonly GraphNode[], inds: Indexer): void {
  // create map of a node to their highest parent, these we assign automatically
  const highestParent = new Map<GraphNode, GraphNode>();
  for (const node of nodes) {
    for (const child of gridChildren(node)) {
      const current = highestParent.get(child);
      if (current === undefined || node.y < current.y) {
        highestParent.set(child, node);
      }
    }
  }

  for (const node of slice(nodes, nodes.length - 1, -1, -1)) {
    // if node wasn't a highest parent, find it a lane
    if (node.ux === undefined) {
      const target = median(map(gridChildren(node), (node) => node.x));
      // note we invert y because we're going bottom up
      node.x = inds.getIndex(nodes.length - node.y, target);
    }

    // if node has a highest parent, assign it to the same lane
    const par = highestParent.get(node);
    if (par !== undefined) {
      if (par.ux === undefined) par.x = node.x;
      inds.setIndex(node.x, nodes.length - par.y);
    }
  }

  // adjust for offset
  const offset = inds.offset();
  for (const node of nodes) {
    node.x += offset;
  }
}

function buildOperator(
  topDownVal: boolean,
  compressedVal: boolean,
  bidirectionalVal: boolean
): LaneGreedy {
  function laneGreedy(ordered: readonly GraphNode[]): void {
    // clear xs
    for (const node of ordered) {
      node.ux = undefined;
    }
    // build indexer
    const inds = indexer(compressedVal, bidirectionalVal);
    // order
    if (topDownVal) {
      topDownOp(ordered, inds);
    } else {
      bottomUpOp(ordered, inds);
    }
  }

  function topDown(val: boolean): LaneGreedy;
  function topDown(): boolean;
  function topDown(val?: boolean): LaneGreedy | boolean {
    if (val === undefined) {
      return topDownVal;
    } else {
      return buildOperator(val, compressedVal, bidirectionalVal);
    }
  }
  laneGreedy.topDown = topDown;

  function compressed(val: boolean): LaneGreedy;
  function compressed(): boolean;
  function compressed(val?: boolean): LaneGreedy | boolean {
    if (val === undefined) {
      return compressedVal;
    } else {
      return buildOperator(topDownVal, val, bidirectionalVal);
    }
  }
  laneGreedy.compressed = compressed;

  function bidirectional(val: boolean): LaneGreedy;
  function bidirectional(): boolean;
  function bidirectional(val?: boolean): LaneGreedy | boolean {
    if (val === undefined) {
      return bidirectionalVal;
    } else {
      return buildOperator(topDownVal, compressedVal, val);
    }
  }
  laneGreedy.bidirectional = bidirectional;

  laneGreedy.d3dagBuiltin = true as const;

  return laneGreedy;
}

/**
 * Create a default {@link LaneGreedy}
 *
 * - {@link LaneGreedy#topDown | `topDown()`}: `true`
 * - {@link LaneGreedy#compressed | `compressed()`}: `true`
 * - {@link LaneGreedy#bidirectional | `bidirectional()`}: `true`
 */
export function laneGreedy(...args: never[]): LaneGreedy {
  if (args.length) {
    throw err`got arguments to laneGreedy(${args}); you probably forgot to construct laneGreedy before passing to lane: \`grid().lane(laneGreedy())\`, note the trailing "()"`;
  }
  return buildOperator(true, true, false);
}
