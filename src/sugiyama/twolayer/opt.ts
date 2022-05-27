/**
 * A {@link TwolayerOpt} that is optimal for only the current layer being
 * rearranged.
 *
 * @packageDocumentation
 */
import { Twolayer } from ".";
import { OptChecking } from "../../layout";
import { Constraint, solve, Variable } from "../../simplex";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * A {@link sugiyama/twolayer!Twolayer} for optimal decrossing of a single target layer
 *
 * The opt order operator orders the relevant layer to minimize the number of
 * crossings. This is expensive, but not nearly as expensive as optimizing all
 * crossings initially.
 *
 * Create with {@link twolayerOpt}.
 *
 * <img alt="two layer opt example" src="media://sugi-simplex-twolayer-quad.png" width="400">
 */
export interface TwolayerOpt extends Twolayer<unknown, unknown> {
  /**
   * Set the large dag handling
   *
   * Setting to anything but `"fast"` will allow running on larger dags, but
   * the layout may run forever, or crash the vm. (default: `"fast"`)
   */
  check(val: OptChecking): TwolayerOpt;
  /** Return the handling of large graphs. */
  check(): OptChecking;

  /**
   * Set whether to also minimize distance between nodes that share a parent or
   * child
   *
   * This adds more variables and constraints so will take longer, but will
   * likely produce a better layout. (default: false)
   */
  dist(val: boolean): TwolayerOpt;
  /** get whether the current layout minimized distance */
  dist(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** @internal */
function buildOperator(options: {
  check: OptChecking;
  dist: boolean;
}): TwolayerOpt {
  function twolayerOpt(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean
  ): void {
    // swap layers
    const reordered = topDown ? bottomLayer : topLayer;
    const numVars = (reordered.length * Math.max(reordered.length - 1, 0)) / 2;

    // initialize model
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};
    const ints: Record<string, 1> = {};

    // initialize map to create ids for labeling constraints
    const inds = new Map(reordered.map((node, i) => [node, i] as const));

    /** create key from nodes */
    function key(...nodes: SugiNode[]): string {
      return nodes
        .map((n) => inds.get(n)!)
        .sort((a, b) => a - b)
        .join(" => ");
    }

    let unconstrained, groups;
    if (topDown) {
      unconstrained = bottomLayer.filter((n) => !n.nparents());
      groups = topLayer
        .map((node) => [...node.children()])
        .filter((cs) => cs.length > 1);
    } else {
      unconstrained = topLayer.filter((n) => !n.nchildren());
      groups = bottomLayer
        .map((node) => [...node.parents()])
        .filter((ps) => ps.length > 1);
    }
    // NOTE distance cost for an unconstrained node ina group can't violate
    // all pairs at once, so the cost is ~(n/2)^2 not n(n-1)/2
    const groupSize = groups.reduce((t, cs) => t + cs.length * cs.length, 0);
    const maxDistCost = (groupSize * unconstrained.length) / 4;
    const distWeight = 1 / (maxDistCost + 1);
    // add small value to objective for preserving the original order of nodes
    const preserveWeight = distWeight / (numVars + 1);

    // need a function that returns whether one child originally came before
    // another, which means we need a reverse map from node to original index
    const cinds = new Map(bottomLayer.map((node, i) => [node, i] as const));

    // add variables for each pair of bottom later nodes indicating if they
    // should be flipped
    for (const [i, n1] of reordered.slice(0, reordered.length - 1).entries()) {
      for (const n2 of reordered.slice(i + 1)) {
        const pair = key(n1, n2);
        ints[pair] = 1;
        constraints[pair] = {
          max: 1,
        };
        variables[pair] = {
          opt: -preserveWeight,
          [pair]: 1,
        };
      }
    }

    // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
    // and b -> c is 1 then a -> c must also be one
    for (const [i, n1] of reordered.slice(0, reordered.length - 1).entries()) {
      for (const [j, n2] of reordered.slice(i + 1).entries()) {
        for (const n3 of reordered.slice(i + j + 2)) {
          const pair1 = key(n1, n2);
          const pair2 = key(n1, n3);
          const pair3 = key(n2, n3);
          const triangle = key(n1, n2, n3);

          const triangleUp = triangle + "+";
          constraints[triangleUp] = {
            max: 1,
          };
          variables[pair1][triangleUp] = 1;
          variables[pair2][triangleUp] = -1;
          variables[pair3][triangleUp] = 1;

          const triangleDown = triangle + "-";
          constraints[triangleDown] = {
            min: 0,
          };
          variables[pair1][triangleDown] = 1;
          variables[pair2][triangleDown] = -1;
          variables[pair3][triangleDown] = 1;
        }
      }
    }

    // add crossing minimization
    for (const [i, p1] of topLayer.slice(0, topLayer.length - 1).entries()) {
      for (const p2 of topLayer.slice(i + 1)) {
        for (const c1 of p1.children()) {
          for (const c2 of p2.children()) {
            if (c1 === c2) {
              continue;
            }
            const pair = topDown ? key(c1, c2) : key(p1, p2);
            variables[pair].opt += Math.sign(cinds.get(c1)! - cinds.get(c2)!);
          }
        }
      }
    }

    // add distance minimization
    if (options.dist) {
      // NOTE this works by looking at triples of nodes with a common ancestor
      // (parent / child) and an unconstrained node. We add a slack variable
      // responsible for the cost to the objective with a weight such that if
      // all constraints are violated, it's still less than one crossing. We
      // then add constraints that say the slack variable must be one if the
      // unconstrained node is inside of the two nodes with a common ancestor.

      for (const node of unconstrained) {
        for (const group of groups) {
          for (const [i, start] of group.entries()) {
            for (const end of group.slice(i + 1)) {
              // want to minimize node being between start and end
              // NOTE we don't sort because we care which is in the center
              const base = [start, node, end]
                .map((n) => inds.get(n)!)
                .join(" => ");
              const slack = `dist ${base}`;
              const normal = `${slack} normal`;
              const reversed = `${slack} reversed`;

              variables[slack] = {
                opt: distWeight,
                [normal]: 1,
                [reversed]: 1,
              };

              let pos = 0;
              for (const [n1, n2] of [
                [start, node],
                [start, end],
                [node, end],
              ]) {
                const pair = key(n1, n2);
                const sign = Math.sign(inds.get(n1)! - inds.get(n2)!);
                pos += +(sign > 0);
                variables[pair][normal] = -sign;
                variables[pair][reversed] = sign;
              }

              constraints[normal] = {
                min: 1 - pos,
              };
              constraints[reversed] = {
                min: pos - 2,
              };
            }
          }
        }
      }
    }

    // check for large input
    const numVari = Object.keys(variables).length;
    const numCons = Object.keys(constraints).length;
    if (options.check !== "oom" && numVari > 1200) {
      throw err`size of dag to twolayerOpt is too large and will likely crash instead of complete; you probably want to use a cheaper twolayer strategy for sugiyama like \`decrossTwoLayer(twolayerAgg())\`, but if you still want to continue you can suppress this check with \`decrossTwoLayer().order(twolayerOpt().check("oom"))\``;
    } else if (options.check === "fast" && (numVari > 400 || numCons > 1000)) {
      throw err`size of dag to twolayerOpt is too large and will likely not finish; you probably want to use a cheaper twolayer strategy for sugiyama like \`decrossTwoLayer(twolayerAgg())\`, but if you still want to continue you can suppress this check with \`decrossTwoLayer().order(twolayerOpt().check("slow"))\``;
    }

    // solve objective
    // NOTE bundling sets this to undefined, and we need it to be settable
    const ordering = solve("opt", "min", variables, constraints, ints);

    // sort layers
    reordered.sort((n1, n2) => ordering[key(n1, n2)] || -1);
  }

  function check(): OptChecking;
  function check(val: OptChecking): TwolayerOpt;
  function check(val?: OptChecking): OptChecking | TwolayerOpt {
    if (val === undefined) {
      return options.check;
    } else {
      return buildOperator({ ...options, check: val });
    }
  }
  twolayerOpt.check = check;

  function dist(): boolean;
  function dist(val: boolean): TwolayerOpt;
  function dist(val?: boolean): boolean | TwolayerOpt {
    if (val === undefined) {
      return options.dist;
    } else {
      return buildOperator({ ...options, dist: val });
    }
  }
  twolayerOpt.dist = dist;

  twolayerOpt.d3dagBuiltin = true as const;

  return twolayerOpt;
}

/**
 * Create a default {@link TwolayerOpt}
 *
 * - {@link TwolayerOpt#check | `check()`}: `"fast"`
 * - {@link TwolayerOpt#dist | `dist()`}: `false`
 */
export function twolayerOpt(...args: never[]): TwolayerOpt {
  if (args.length) {
    throw err`got arguments to twolayerOpt(${args}); you probably forgot to construct twolayerOpt before passing to order: \`decrossTwoLayer().order(twolayerOpt())\`, note the trailing "()"`;
  }
  return buildOperator({ check: "fast", dist: false });
}
