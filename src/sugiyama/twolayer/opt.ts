/**
 * A {@link TwolayerOpt} that is optimal for only the current layer being
 * rearranged.
 *
 * @packageDocumentation
 */
import { Twolayer } from ".";
import { listMultimapPush } from "../../collections";
import { entries, first, map, reduce, slice } from "../../iters";
import { OptChecking } from "../../layout";
import { Constraint, solve, Variable } from "../../simplex";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * a {@link Twolayer} for optimal decrossing of a single target layer
 *
 * The opt order operator orders the relevant layer to minimize the number of
 * crossings. This is expensive, but not nearly as expensive as optimizing all
 * crossings initially.
 *
 * Create with {@link twolayerOpt}.
 */
export interface TwolayerOpt extends Twolayer<unknown, unknown> {
  /**
   * set the checking for large dag options
   *
   * Setting to anything but `"fast"` will allow running on larger dags, but
   * the layout may run forever, or crash the vm.
   *
   * (default: `"fast"`)
   */
  check(val: OptChecking): TwolayerOpt;
  /** return the checking of large graphs */
  check(): OptChecking;

  /**
   * set whether to also minimize distance between nodes with common ancestors
   *
   * This adds more variables and constraints so will take longer, but will
   * likely produce a better layout. It is the same as {@link DecrossOpt#dist}.
   *
   * (default: `false`)
   */
  dist(val: boolean): TwolayerOpt;
  /** get whether the current layout minimizes distance */
  dist(): boolean;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** variable for comparison between nodes in final ordering */
function pair(find: number, sind: number): string {
  return `${find} => ${sind}`;
}

/** minimize crossings by shuffling reorder */
function minCrossings(
  reordered: SugiNode[],
  inds: Map<SugiNode, number>,
  oinds: Map<SugiNode, number>,
  counts: (node: SugiNode) => IterableIterator<readonly [SugiNode, number]>,
  { dist, check }: { dist: boolean; check: OptChecking },
): Record<string, number> {
  // compute unconstrained nodes for distance minimization
  const unconstrained = dist ? reordered.filter((n) => !first(counts(n))) : [];
  const groups = new Map<SugiNode, SugiNode[]>();
  if (dist) {
    for (const node of reordered) {
      for (const [child] of counts(node)) {
        listMultimapPush(groups, child, node);
      }
    }
  }

  // compute model size
  const numVars = Math.max((reordered.length * (reordered.length - 1)) / 2, 0);
  // NOTE distance cost for an unconstrained node in a group can't violate
  // all pairs at once, the cost is ~(n/2)^2 not n(n-1)/2
  const groupSize = reduce(
    groups.values(),
    (t, c) => t + c.length * c.length,
    0,
  );
  const maxDistCons = (groupSize * unconstrained.length) / 4;

  const variables: Record<string, Variable> = {};
  const constraints: Record<string, Constraint> = {};
  const ints: Record<string, 1> = {};

  const distWeight = 1 / (maxDistCons + 1);
  // add small value to objective for preserving the original order of nodes
  const preserveWeight = distWeight / (numVars + 1);

  // add variables for each pair of bottom later nodes indicating if they
  // should be flipped
  for (const [i, n1] of entries(slice(reordered, 0, reordered.length - 1))) {
    const i1 = inds.get(n1)!;
    for (const n2 of slice(reordered, i + 1)) {
      const i2 = inds.get(n2)!;
      const key = pair(i1, i2);
      ints[key] = 1;
      constraints[key] = { max: 1 };
      variables[key] = {
        // small weight to prefer current ordering
        opt: preserveWeight,
        [key]: 1,
      };
    }
  }

  // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
  // and b -> c is 1 then a -> c must also be one
  for (const [i, n1] of entries(slice(reordered, 0, reordered.length - 1))) {
    const i1 = inds.get(n1)!;
    for (const [j, n2] of entries(slice(reordered, i + 1))) {
      const i2 = inds.get(n2)!;
      for (const n3 of slice(reordered, i + j + 2)) {
        const i3 = inds.get(n3)!;
        const pair1 = pair(i1, i2);
        const pair2 = pair(i1, i3);
        const pair3 = pair(i2, i3);
        const triangle = `tri: ${i1} - ${i2} - ${i3}`;
        const triangleUp = `${triangle} +`;
        const triangleDown = `${triangle} -`;

        constraints[triangleUp] = { max: 1 };
        variables[pair1][triangleUp] = 1;
        variables[pair2][triangleUp] = -1;
        variables[pair3][triangleUp] = 1;

        constraints[triangleDown] = { min: 0 };
        variables[pair1][triangleDown] = 1;
        variables[pair2][triangleDown] = -1;
        variables[pair3][triangleDown] = 1;
      }
    }
  }

  // add crossing minimization
  for (const [i, p1] of entries(slice(reordered, 0, reordered.length - 1))) {
    const pi1 = inds.get(p1)!;
    for (const p2 of slice(reordered, i + 1)) {
      const pi2 = inds.get(p2)!;
      const key = pair(pi1, pi2);
      for (const [c1, n1] of counts(p1)) {
        const i1 = oinds.get(c1)!;
        for (const [c2, n2] of counts(p2)) {
          if (c1 === c2) {
            continue;
          }
          const i2 = oinds.get(c2)!;
          variables[key].opt += Math.sign(i2 - i1) * n1 * n2;
        }
      }
    }
  }

  // add distance minimization
  // NOTE this works by looking at triples of nodes with a common ancestor
  // (parent / child) and an unconstrained node. We add a slack variable
  // responsible for the cost to the objective with a weight such that if
  // all constraints are violated, it's still less than one crossing. We
  // then add constraints that say the slack variable must be one if the
  // unconstrained node is inside of the two nodes with a common ancestor.
  for (const node of unconstrained) {
    const ni = inds.get(node)!;
    for (const group of groups.values()) {
      for (const [i, start] of entries(group)) {
        const si = inds.get(start)!;
        for (const end of slice(group, i + 1)) {
          const ei = inds.get(end)!;
          // want to minimize node being between start and end
          // NOTE we don't sort because we care which is in the center
          const slack = `dist: ${si} - ${ni} - ${ei}`;
          const normal = `${slack} :normal`;
          const reversed = `${slack} :reversed`;

          variables[slack] = {
            opt: distWeight,
            [normal]: 1,
            [reversed]: 1,
          };

          let invs = 0;
          for (const [i1, i2] of [
            [si, ni],
            [si, ei],
            [ni, ei],
          ]) {
            const key = i1 < i2 ? pair(i1, i2) : pair(i2, i1);
            const sign = Math.sign(i1 - i2);
            invs += sign;
            variables[key][normal] = -sign;
            variables[key][reversed] = sign;
          }

          constraints[normal] = { min: (invs + 1) / -2 };
          constraints[reversed] = { min: (invs - 1) / 2 };
        }
      }
    }
  }

  // check size of optimization
  // NOTE it's possible to compute these numbers from the input, but that's
  // more error prone, and doesn't really save much
  const totalVars = Object.keys(variables).length;
  const totalCons = Object.keys(constraints).length;
  if (check !== "oom" && totalVars > 1200) {
    throw err`size of dag to twolayerOpt is too large and will likely crash instead of complete; you probably want to use a cheaper twolayer strategy for sugiyama like \`decrossTwoLayer(twolayerAgg())\`, but if you still want to continue you can suppress this check with \`decrossTwoLayer().order(twolayerOpt().check("oom"))\``;
  } else if (check === "fast" && (totalVars > 400 || totalCons > 1000)) {
    throw err`size of dag to twolayerOpt is too large and will likely not finish; you probably want to use a cheaper twolayer strategy for sugiyama like \`decrossTwoLayer(twolayerAgg())\`, but if you still want to continue you can suppress this check with \`decrossTwoLayer().order(twolayerOpt().check("slow"))\``;
  }

  // solve objective
  // NOTE bundling sets this to undefined, and we need it to be settable
  return solve("opt", "min", variables, constraints, ints);
}

/** @internal */
function buildOperator(options: {
  check: OptChecking;
  dist: boolean;
}): TwolayerOpt {
  function twolayerOpt(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean,
  ): void {
    // swap layers
    const [reordered, other] = topDown
      ? [bottomLayer, topLayer]
      : [topLayer, bottomLayer];
    const counts = topDown
      ? (n: SugiNode) => n.parentCounts()
      : (n: SugiNode) => n.childCounts();

    // initialize map to create ids for labeling constraints
    const inds = new Map(map(reordered, (node, i) => [node, i]));
    // we need a way to query the order of "other" nodes in constant time
    const oinds = new Map(map(other, (node, i) => [node, i]));

    // iterate over chunks separated by long nodes
    const ordering: Record<string, number> = {};
    const reo = [];
    for (const node of reordered) {
      if (oinds.has(node)) {
        const ord = minCrossings(reo, inds, oinds, counts, options);
        Object.assign(ordering, ord);
        reo.length = 0;
      } else {
        reo.push(node);
      }
    }
    const ord = minCrossings(reo, inds, oinds, counts, options);
    Object.assign(ordering, ord);

    // sort layers
    reordered.sort((n1, n2) => {
      const i1 = inds.get(n1)!;
      const i2 = inds.get(n2)!;
      // NOTE i1 is always < i2 due to the way sort is implemented
      /* istanbul ignore next */
      return i1 < i2
        ? ordering[pair(i1, i2)] || -1
        : -(ordering[pair(i2, i1)] || -1);
    });
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
 * create a default {@link TwolayerOpt}
 *
 * This is a {@link Twolayer} that optimally removes crossings between the two
 * layers. Because this is local, it might not fully remove link crossings that
 * {@link decrossOpt} will, but it can run on larger dags and will often be
 * faster.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().decross(decrossTwoLayer().order(twolayerOpt()));
 * ```
 */
export function twolayerOpt(...args: never[]): TwolayerOpt {
  if (args.length) {
    throw err`got arguments to twolayerOpt(${args}); you probably forgot to construct twolayerOpt before passing to order: \`decrossTwoLayer().order(twolayerOpt())\`, note the trailing "()"`;
  }
  return buildOperator({ check: "fast", dist: false });
}
