/**
 * A {@link LaneOperator} that assigns lanes greedily, but quickly.
 *
 * @module
 */
import { least, median } from "d3-array";
import { LaneOperator } from ".";
import { DagNode } from "../../dag";
import { map, reverse } from "../../iters";
import { assert, def } from "../../utils";

/**
 * A lane operator that assigns lanes greedily, but quickly.
 *
 * Create with {@link greedy}.
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
export interface GreedyOperator extends LaneOperator<unknown, unknown> {
  /**
   * Set whether the greedy assignment should be top-down or bottom-up.
   * (default: true)
   */
  topDown(val: boolean): GreedyOperator;
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
  compressed(val: boolean): GreedyOperator;
  /** Get the current compressed setting */
  compressed(): boolean;

  /**
   * Set whether to assign bidirectional indices
   *
   * The first node will be assigned lane zero. If bidirectional, the lanes can
   * fan out in either direction from there, otherwise new lanes will always be
   * added to the right. (default: false)
   */
  bidirectional(val: boolean): GreedyOperator;
  /** Get the current bidirectional setting */
  bidirectional(): boolean;
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
 * an indexer that only assigns non-negatibe indices
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
    const targ = target ?? 0;
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
    const targ = target ?? 0;
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
 * them, giving the farthest awat children lanes first.
 *
 * @internal
 */
function topDownOp(nodes: readonly DagNode[], inds: Indexer): void {
  // set all xs to undefined so we know what we've seen before
  for (const node of nodes) {
    node.x = undefined;
  }

  // if node is new (no children) give it an arbitrary index
  for (const node of nodes) {
    assert(node.y !== undefined);
    if (node.x === undefined) {
      node.x = inds.getIndex(node.y);
    }

    // iterate over children from farthest away to closest, assign each a lane
    // in order, trying to be as close to their parent as possible
    for (const [child, cy] of [
      ...map(node.ichildren(), (c) => [c, def(c.y)] as const)
    ].sort(([, ay], [, by]) => by - ay)) {
      if (child.x === undefined) {
        child.x = inds.getIndex(node.y, node.x);
        inds.setIndex(child.x, cy);
      }
    }
  }

  // update according to offset
  const offset = inds.offset();
  for (const node of nodes) {
    assert(node.x !== undefined);
    node.x += offset;
  }
}

/**
 * assign lanes based on bottom up approach
 *
 * This method assigns a nodes highest parent the same lane as it, and
 * otherwise deferrs from assigning lanes.
 *
 * @internal
 */
function bottomUpOp(nodes: readonly DagNode[], inds: Indexer): void {
  // create map of a node to their highest parent, these we assign automatically
  const highestParent = new Map<DagNode, DagNode>();
  for (const node of nodes) {
    node.x = undefined;
    assert(node.y !== undefined);
    for (const child of node.ichildren()) {
      const current = highestParent.get(child);
      if (current === undefined || node.y < def(current.y)) {
        highestParent.set(child, node);
      }
    }
  }

  for (const node of reverse(nodes)) {
    // if node wasn't a highest parent, find it a lane
    if (node.x === undefined) {
      const target = median(map(node.ichildren(), (c) => c.x));
      // note wi invert y because we're going bottom up
      node.x = inds.getIndex(nodes.length - def(node.y), target);
    }

    // if node has a highest parent, assign it to the same lane
    const par = highestParent.get(node);
    if (par !== undefined) {
      par.x ??= node.x;
      inds.setIndex(node.x, nodes.length - def(par.y));
    }
  }

  // adjust for offset
  const offset = inds.offset();
  for (const node of nodes) {
    assert(node.x != undefined);
    node.x += offset;
  }
}

/** @internal */
function buildOperator(
  topDownVal: boolean,
  compressedVal: boolean,
  bidirectionalVal: boolean
): GreedyOperator {
  function greedyCall(ordered: readonly DagNode[]): void {
    const inds = indexer(compressedVal, bidirectionalVal);
    if (topDownVal) {
      topDownOp(ordered, inds);
    } else {
      bottomUpOp(ordered, inds);
    }
  }

  function topDown(val: boolean): GreedyOperator;
  function topDown(): boolean;
  function topDown(val?: boolean): GreedyOperator | boolean {
    if (val === undefined) {
      return topDownVal;
    } else {
      return buildOperator(val, compressedVal, bidirectionalVal);
    }
  }
  greedyCall.topDown = topDown;

  function compressed(val: boolean): GreedyOperator;
  function compressed(): boolean;
  function compressed(val?: boolean): GreedyOperator | boolean {
    if (val === undefined) {
      return compressedVal;
    } else {
      return buildOperator(topDownVal, val, bidirectionalVal);
    }
  }
  greedyCall.compressed = compressed;

  function bidirectional(val: boolean): GreedyOperator;
  function bidirectional(): boolean;
  function bidirectional(val?: boolean): GreedyOperator | boolean {
    if (val === undefined) {
      return bidirectionalVal;
    } else {
      return buildOperator(topDownVal, compressedVal, val);
    }
  }
  greedyCall.bidirectional = bidirectional;

  return greedyCall;
}

/**
 * Create a default {@link GreedyOperator}, bundled as {@link laneGreedy}.
 */
export function greedy(...args: never[]): GreedyOperator {
  if (args.length) {
    throw new Error(
      `got arguments to greedy(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(true, true, false);
}
