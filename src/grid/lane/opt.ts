/**
 * A {@link Lane} that assigns lanes to minimize edge crossings.
 *
 * @packageDocumentation
 */
import { Lane } from ".";
import { GraphNode } from "../../graph";
import { map } from "../../iters";
import { OptChecking } from "../../layout";
import { Constraint, solve, Variable } from "../../simplex";
import { err } from "../../utils";
import { gridChildren } from "./utils";

/**
 * a lane operator that assigns lanes to minimize edge crossings.
 *
 * Create with {@link laneOpt}.
 */
export interface LaneOpt extends Lane<unknown, unknown> {
  /**
   * set whether to used compressed output
   *
   * If output is compressed then the number of crossings will be minimized
   * subject to the fewest number of lanes necessary.
   *
   * (default: `false`)
   */
  compressed(val: boolean): LaneOpt;
  /** get the current compressed setting */
  compressed(): boolean;

  /**
   * set whether to also minimize distance between connected nodes
   *
   * This adds more variables and constraints so will take longer, but will
   * likely produce a better layout.
   *
   * (default: `true`)
   */
  dist(val: boolean): LaneOpt;
  /** get whether the current layout minimized distance */
  dist(): boolean;

  /**
   * set the large dag handling
   *
   * Setting to anything but `"fast"` will allow running on larger dags, but
   * the layout may run forever, or crash the vm.
   *
   * (default: `"fast"`)
   */
  check(val: OptChecking): LaneOpt;
  /** Return the handling of large graphs. */
  check(): OptChecking;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function getCompressedWidth(ordered: readonly GraphNode[]): number {
  const indices: number[] = [];
  const assigned = new Set<GraphNode>();

  // if node is new (no children) give it a free index
  for (const node of ordered) {
    if (!assigned.has(node)) {
      const free = indices.findIndex((v) => v <= node.y);
      const ind = free === -1 ? indices.length : free;
      indices[ind] = node.y;
    }

    // iterate over children from farthest away to closest assigning indices
    for (const child of [...gridChildren(node)].sort((a, b) => b.y - a.y)) {
      if (!assigned.has(child)) {
        const free = indices.findIndex((v) => v <= node.y);
        const ind = free === -1 ? indices.length : free;
        indices[ind] = child.y;
        assigned.add(child);
      }
    }
  }

  // return number of indices necessary
  return indices.length;
}

/** @internal */
function buildOperator(options: {
  compressed: boolean;
  dist: boolean;
  check: OptChecking;
}): LaneOpt {
  function laneOpt(ordered: readonly GraphNode[]): void {
    // initialize model
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};
    const ints: Record<string, 1> = {};

    // map of node to its unique index / id
    const inds = new Map(map(ordered, (n, i) => [n, i] as const));
    const width = options.compressed
      ? getCompressedWidth(ordered)
      : Math.max(ordered.length - 1, 1);

    for (const ind of ordered.keys()) {
      variables[ind] = { opt: 0, [ind]: 1 };
      constraints[ind] = { max: width - 1 };
    }

    const parentIndex = new Map<GraphNode, number>();
    for (const [ind, node] of ordered.entries()) {
      const topIndex = parentIndex.get(node);
      if (topIndex !== undefined) {
        // have the potential for crossings
        for (const [off, above] of ordered.slice(topIndex + 1, ind).entries()) {
          const aind = off + topIndex + 1;
          const pair = `${ind}-${aind}-above`;
          variables[pair] = { opt: 0, [pair]: 1 };
          constraints[pair] = { max: 1 };
          ints[pair] = 1;

          // constraints there to be room above node, and defines pair variable
          // which indicates if above node is left or right node
          const pairSpan = `${pair}-span`;
          variables[ind][pairSpan] = 1;
          variables[aind][pairSpan] = -1;
          variables[pair][pairSpan] = -width;
          constraints[pairSpan] = { min: 1 - width, max: -1 };

          for (const child of gridChildren(above)) {
            if (child === node) continue; // can't cross self
            // for each child of above node, we check if it crosses, and bound
            // trip node to be one of there's a crossing
            const cind = inds.get(child)!;
            const trip = `${pair}-${cind}-cross`;
            variables[trip] = { opt: 1, [trip]: 1 };
            constraints[trip] = { max: 1 };
            ints[trip] = 1;

            const tripLeft = `${trip}-left`;
            variables[ind][tripLeft] = -1;
            variables[cind][tripLeft] = 1;
            variables[pair][tripLeft] = width;
            variables[trip][tripLeft] = -width;
            constraints[tripLeft] = { max: width };

            const tripRight = `${trip}-right`;
            variables[ind][tripRight] = -1;
            variables[cind][tripRight] = 1;
            variables[pair][tripRight] = width;
            variables[trip][tripRight] = width;
            constraints[tripRight] = { min: 0 };
          }
        }
      }

      // update parent index
      for (const child of gridChildren(node)) {
        if (!parentIndex.has(child)) {
          parentIndex.set(child, ind);
        }
      }
    }

    // also add distance minimizers
    if (options.dist) {
      // we scale by numEdges and width here to make sure that contribution to
      // optimum is always less than one
      const numEdges = ordered.reduce((t, n) => t + gridChildren(n).size, 0);
      for (const [ind, node] of ordered.entries()) {
        for (const child of gridChildren(node)) {
          const cind = inds.get(child)!;
          const key = `${ind}-${cind}-dist`;
          variables[key] = { opt: 1 / numEdges };

          const upper = `${key}-upper`;
          variables[ind][upper] = 1;
          variables[cind][upper] = -1;
          variables[key][upper] = -width;
          constraints[upper] = { max: 0 };

          const lower = `${key}-lower`;
          variables[ind][lower] = 1;
          variables[cind][lower] = -1;
          variables[key][lower] = width;
          constraints[lower] = { min: 0 };
        }
      }
    }

    // check for large input
    const numVari = Object.keys(variables).length;
    const numCons = Object.keys(constraints).length;
    if (options.check !== "oom" && numVari > 2000) {
      throw err`size of dag to decrossOpt is too large and will likely crash instead of complete; you probably want to use a cheaper decrossing strategy for sugiyama like \`sugiyama().decross(decrossTwoLayer())\`, but if you still want to continue you can suppress this check with \`sugiyama().decross(decrossOp().check("oom"))\``;
    } else if (options.check === "fast" && (numVari > 1000 || numCons > 5000)) {
      throw err`size of dag to decrossOpt is too large and will likely not complete; you probably want to use a cheaper decrossing strategy for sugiyama like \`sugiyama().decross(decrossTwoLayer())\`, but if you still want to continue you can suppress this check with \`sugiyama().decross(decrossOp().check("slow"))\``;
    }

    const lanes = solve("opt", "min", variables, constraints, ints);

    if (options.compressed) {
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

  function compressed(val: boolean): LaneOpt;
  function compressed(): boolean;
  function compressed(val?: boolean): LaneOpt | boolean {
    if (val === undefined) {
      return options.compressed;
    } else {
      return buildOperator({ ...options, compressed: val });
    }
  }
  laneOpt.compressed = compressed;

  function dist(val: boolean): LaneOpt;
  function dist(): boolean;
  function dist(val?: boolean): LaneOpt | boolean {
    if (val === undefined) {
      return options.dist;
    } else {
      return buildOperator({ ...options, dist: val });
    }
  }
  laneOpt.dist = dist;

  function check(val: OptChecking): LaneOpt;
  function check(): OptChecking;
  function check(val?: OptChecking): LaneOpt | OptChecking {
    if (val === undefined) {
      return options.check;
    } else {
      return buildOperator({ ...options, check: val });
    }
  }
  laneOpt.check = check;

  laneOpt.d3dagBuiltin = true as const;

  return laneOpt;
}

/**
 * create a default {@link LaneOpt}
 *
 * This {@link Lane} operator optimally minimizes edge crossings, but can take
 * a long time and may crash on large graphs. The {@link LaneOpt#check} option
 * is set to error if the graph is too big. {@link LaneOpt#compressed} and
 * {@link LaneOpt#dist} slightly tweak the resulting layout.
 *
 * @example
 *
 * ```ts
 * const builder = grid().lane(laneOpt().compressed(true));
 * ```
 */
export function laneOpt(...args: never[]): LaneOpt {
  if (args.length) {
    throw err`got arguments to laneOpt(${args}); you probably forgot to construct laneOpt before passing to lane: \`grid().lane(laneOpt())\`, note the trailing "()"`;
  }
  return buildOperator({ compressed: false, dist: true, check: "fast" });
}
