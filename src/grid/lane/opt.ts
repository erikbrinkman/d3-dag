/**
 * A {@link LaneOperator} that assigns lanes to minimize edge crossings.
 *
 * @module
 */
import { Model, Solve } from "javascript-lp-solver";
import { LaneOperator } from ".";
import { DagNode } from "../../dag";
import { map } from "../../iters";

/**
 * A lane operator that assigns lanes to minimize edge crossings.
 *
 * Create with {@link opt}.
 *
 * @example
 * <img alt="grid greedy example" src="media://grid-opt.png" width="200">
 */
export interface OptOperator extends LaneOperator<unknown, unknown> {
  /**
   * Set whether to used compressed output
   *
   * If output is compressed then the number of crossings will be minimized
   * subject to the fewest number of lanes necessary. (default: false)
   */
  compressed(val: boolean): OptOperator;
  /** Get the current compressed setting */
  compressed(): boolean;

  /**
   * Set whether to also minimize distance between connected nodes
   *
   * This adds more variables and constraints so will take longer, but will
   * likely produce a better layout. (default: true)
   */
  dist(val: boolean): OptOperator;
  /** get whether the current layout minimized distance */
  dist(): boolean;
}

function getCompressedWidth(ordered: readonly DagNode[]): number {
  const indices: number[] = [];
  const assigned = new Set<DagNode>();

  // if node is new (no children) git it a free index
  for (const node of ordered) {
    if (!assigned.has(node)) {
      const free = indices.findIndex((v) => v <= node.y!);
      const ind = free === -1 ? indices.length : free;
      indices[ind] = node.y!;
    }

    // iterate over children from farthest away to closest assigning indices
    for (const child of [...node.ichildren()].sort((a, b) => b.y! - a.y!)) {
      if (!assigned.has(child)) {
        const free = indices.findIndex((v) => v <= node.y!);
        const ind = free === -1 ? indices.length : free;
        indices[ind] = child.y!;
        assigned.add(child);
      }
    }
  }

  // return number of indices necessary
  return indices.length;
}

/** @internal */
function buildOperator(compressedVal: boolean, distVal: boolean): OptOperator {
  function optCall(ordered: readonly DagNode[]): void {
    // initialize model
    const model: Model = {
      optimize: "opt",
      opType: "min",
      constraints: {},
      variables: {},
      ints: {}
    };

    // map of node to its unique index / id
    const inds = new Map(map(ordered, (n, i) => [n, i] as const));
    const width = compressedVal
      ? getCompressedWidth(ordered)
      : ordered.length - 1;

    for (const ind of ordered.keys()) {
      model.variables[ind] = { opt: 0, [ind]: 1 };
      model.constraints[ind] = { max: width - 1 };
    }

    const parentIndex = new Map<DagNode, number>();
    for (const [ind, node] of ordered.entries()) {
      const topIndex = parentIndex.get(node);
      if (topIndex !== undefined) {
        // have the potential for crossings
        for (const [off, above] of ordered.slice(topIndex + 1, ind).entries()) {
          const aind = off + topIndex + 1;
          const pair = `${ind}-${aind}-above`;
          model.variables[pair] = { opt: 0, [pair]: 1 };
          model.constraints[pair] = { max: 1 };
          model.ints[pair] = 1;

          // constraints there to be room above node, and defines pair variable
          // which indicates if above node is left or right node
          const pairSpan = `${pair}-span`;
          model.variables[ind][pairSpan] = 1;
          model.variables[aind][pairSpan] = -1;
          model.variables[pair][pairSpan] = -width;
          model.constraints[pairSpan] = { min: 1 - width, max: -1 };

          for (const child of above.ichildren()) {
            if (child === node) continue; // can't cross self
            // for each child of above node, we check if it crosses, and bound
            // trip node to be one of there's a crossing
            const cind = inds.get(child)!;
            const trip = `${pair}-${cind}-cross`;
            model.variables[trip] = { opt: 1, [trip]: 1 };
            model.constraints[trip] = { max: 1 };
            model.ints[trip] = 1;

            const tripLeft = `${trip}-left`;
            model.variables[ind][tripLeft] = -1;
            model.variables[cind][tripLeft] = 1;
            model.variables[pair][tripLeft] = width;
            model.variables[trip][tripLeft] = -width;
            model.constraints[tripLeft] = { max: width };

            const tripRight = `${trip}-right`;
            model.variables[ind][tripRight] = -1;
            model.variables[cind][tripRight] = 1;
            model.variables[pair][tripRight] = width;
            model.variables[trip][tripRight] = width;
            model.constraints[tripRight] = { min: 0 };
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

    // also add distance minimizers
    if (distVal) {
      // we scale by numEdges and width here to make sure that contribution to
      // optimum is always less than one
      const numEdges = ordered.reduce((t, n) => t + n.children().length, 0);
      for (const [ind, node] of ordered.entries()) {
        for (const child of node.ichildren()) {
          const cind = inds.get(child)!;
          const key = `${ind}-${cind}-dist`;
          model.variables[key] = { opt: 1 / numEdges };

          const upper = `${key}-upper`;
          model.variables[ind][upper] = 1;
          model.variables[cind][upper] = -1;
          model.variables[key][upper] = -width;
          model.constraints[upper] = { max: 0 };

          const lower = `${key}-lower`;
          model.variables[ind][lower] = 1;
          model.variables[cind][lower] = -1;
          model.variables[key][lower] = width;
          model.constraints[lower] = { min: 0 };
        }
      }
    }

    const { feasible, ...lanes } = Solve.call({}, model);
    /* istanbul ignore next */
    if (!feasible) {
      throw new Error("internal error: couldn't find a feasible solution");
    }

    if (distVal || compressedVal) {
      // if we minimize distance, we know this will be compact
      for (const [ind, node] of ordered.entries()) {
        node.x = lanes[ind] ?? 0;
      }
    } else {
      // otherwise we have to remove the indices that were skipped over
      const vals = new Set<number>();
      for (const ind of ordered.keys()) {
        vals.add(lanes[ind] ?? 0);
      }
      const mapping = new Map(map([...vals].sort(), (v, i) => [v, i] as const));
      for (const [ind, node] of ordered.entries()) {
        node.x = mapping.get(lanes[ind] ?? 0)!;
      }
    }
  }

  function compressed(val: boolean): OptOperator;
  function compressed(): boolean;
  function compressed(val?: boolean): OptOperator | boolean {
    if (val === undefined) {
      return compressedVal;
    } else {
      return buildOperator(val, distVal);
    }
  }
  optCall.compressed = compressed;

  function dist(val: boolean): OptOperator;
  function dist(): boolean;
  function dist(val?: boolean): OptOperator | boolean {
    if (val === undefined) {
      return distVal;
    } else {
      return buildOperator(compressedVal, val);
    }
  }
  optCall.dist = dist;

  return optCall;
}

/**
 * Create a default {@link OptOperator}, bundled as {@link laneOpt}.
 */
export function opt(...args: never[]): OptOperator {
  if (args.length) {
    throw new Error(
      `got arguments to opt(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator(false, true);
}
