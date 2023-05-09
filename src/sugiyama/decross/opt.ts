/**
 * An {@link DecrossOpt} for optimally minimizing the number of crossings.
 *
 * @packageDocumentation
 */
import { Decross } from ".";
import { listMultimapPush } from "../../collections";
import { bigrams, entries, filter, map, slice } from "../../iters";
import { OptChecking } from "../../layout";
import { Constraint, Variable, solve } from "../../simplex";
import { err, ierr } from "../../utils";
import { SugiNode } from "../sugify";

// FIXME add option that remove the crossing minimization, so it's just, make
// valid keeping the order as close as possible

/**
 * a {@link Decross} that minimizes the number of crossings
 *
 * This method brute forces an NP-Complete problem, and as such may run for an
 * exceedingly long time on large graphs. As a result, any graph that is
 * probably too large will throw an error instead of running. Use with care.
 *
 * Create with {@link decrossOpt}.
 */
export interface DecrossOpt extends Decross<unknown, unknown> {
  /**
   * set how to check for large dags
   *
   * The default settings is set to error if the graph is too large.  If you
   * modify this, the layout may run forever, or may crash. See
   * {@link OptChecking} for more details.
   *
   * (default: `"fast"`)
   *
   * @example
   *
   * ```ts
   * const decross = decrossOpt().check("slow");
   * ```
   */
  check(val: OptChecking): DecrossOpt;
  /** get the current check for large graphs */
  check(): OptChecking;
  /**
   * set whether to also minimize distance between nodes that share an ancestor
   *
   * This setting adds more variables and constraints, and so will make the
   * decrossing step take longer, but will likely produce a better layout as
   * nodes that share common parents or children will be put closer together if
   * it doesn't affect the number of crossings. It is especially usefuly for
   * ancestry layoutss where nodes that share a child will inherently be put
   * closer together even if it doesn't reduce the number of crossings.
   *
   * (default: `false`)
   */
  dist(val: boolean): DecrossOpt;
  /** get whether the current layout minimized distance */
  dist(): boolean;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * pop the minimum node from counts
 *
 * there are pathological cases where the queue will be empty, but more nodes exist. This only happens when solid nodes cross, and in order to preserve the invariant we need to permute the nodes. We solve this by taking an arbitrary small count node, and finally permuting the layers to be consistent.
 */
function popMin(counts: Map<SugiNode, number>): SugiNode | undefined {
  let min;
  let mcount = Infinity;
  for (const [node, count] of counts) {
    if (count < mcount) {
      mcount = count;
      min = node;
    }
  }
  if (min !== undefined) {
    counts.delete(min);
  }
  return min;
}

/**
 * compute unique indices for sugi nodes
 *
 * indices are computed such that for two nodes in the same layer, the left most
 * node always has a lower index.
 */
function computeInds(layers: SugiNode[][]): Map<SugiNode, number> {
  // this implementation treats the layers like their own dag and does a before
  // order traversal to set ids
  const following = new Map<SugiNode, SugiNode[]>();
  const counts = new Map<SugiNode, number>();
  for (const layer of layers) {
    for (const [first, second] of bigrams(layer)) {
      const count = counts.get(second) ?? 0;
      counts.set(second, count + 1);
      listMultimapPush(following, first, second);
    }
  }

  const starts = new Set<SugiNode>(map(layers, ([node]) => node));
  const queue: SugiNode[] = [...filter(starts, (node) => !counts.get(node))];
  const inds = new Map<SugiNode, number>();
  let i = 0;
  let needSort = false;
  let node;
  while ((node = queue.pop() ?? ((needSort = true), popMin(counts)))) {
    inds.set(node, i++);
    for (const next of following.get(node) ?? []) {
      const rem = counts.get(next)! - 1;
      if (rem) {
        counts.set(next, rem);
      } else {
        queue.push(next);
        counts.delete(next);
      }
    }
  }

  // we need a sort to correct for pathological inputs
  if (needSort) {
    for (const layer of layers) {
      layer.sort((a, b) => inds.get(a)! - inds.get(b)!);
    }
  }

  return inds;
}

function buildOperator(options: {
  check: OptChecking;
  dist: boolean;
}): DecrossOpt {
  // TODO optimize this for disconnected graphs by breaking them apart, solving
  // each, then mushing them back together

  function decrossOpt(layers: SugiNode[][]): void {
    const numVars = layers.reduce(
      (t, l) => t + (l.length * Math.max(l.length - 1, 0)) / 2,
      0
    );

    // compute extra constraints for minimizing distance
    // NOTE we do this here so that we can compute the necessary cost for
    // preserving the ordering such that it's less than the cost to minimize
    // distances
    const distanceConstraints: [SugiNode[], SugiNode[][]][] = [];
    if (options.dist) {
      for (const [ti, [topLayer, bottomLayer]] of entries(bigrams(layers))) {
        const bi = ti + 1;

        const topUnconstrained = bottomLayer.filter(
          (node) =>
            node.data.role === "node" &&
            node.data.topLayer === bi &&
            !node.nparents()
        );
        const topGroups = topLayer.map((node) =>
          node.data.role === "node" && node.data.bottomLayer === ti
            ? [...node.children()]
            : []
        );
        distanceConstraints.push([topUnconstrained, topGroups]);

        const bottomUnconstrained = topLayer.filter(
          (node) =>
            node.data.role === "node" &&
            node.data.bottomLayer === ti &&
            !node.nchildren()
        );
        const bottomGroups = bottomLayer.map((node) =>
          node.data.role === "node" && node.data.topLayer === bi
            ? [...node.parents()]
            : []
        );
        distanceConstraints.push([bottomUnconstrained, bottomGroups]);
      }
    }

    // map every node to an id for quick access, if one node's id is less than
    // another on the same layer, it must come before it on that layer
    const inds = computeInds(layers);

    // variable name for the relative order of two nodes in a layer
    function pair(find: number, sind: number): string {
      return `${find} => ${sind}`;
    }

    // NOTE distance cost for an unconstrained node ina group can't violate
    // all pairs at once, so cost is ~(n/2)^2 not n(n-1)/2
    const maxDistCost =
      distanceConstraints.reduce((cost, [unc, gs]) => {
        return gs.reduce((t, cs) => t + cs.length * cs.length, 0) * unc.length;
      }, 0) / 4;
    const distWeight = 1 / (maxDistCost + 1);
    // add small value to objective for preserving the original order of nodes
    const preserveWeight = distWeight / (numVars + 1);

    // initialize model
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};
    const ints: Record<string, 1> = {};

    // add variables and permutation invariants
    for (const layer of layers) {
      // add binary variables for each pair of layer nodes indicating if they
      // should be flipped
      for (const [i, n1] of layer.entries()) {
        const i1 = inds.get(n1)!;
        for (const n2 of slice(layer, i + 1)) {
          const i2 = inds.get(n2)!;
          const key = pair(i1, i2);
          ints[key] = 1;
          constraints[key] = { max: 1 };
          variables[key] = {
            // add small value to objective for preserving the original order of nodes
            opt: preserveWeight,
            [key]: 1,
          };
        }
      }

      // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
      // and b -> c is 1 then a -> c must also be one
      for (const [i, n1] of layer.entries()) {
        const i1 = inds.get(n1)!;
        for (const [j, n2] of entries(slice(layer, i + 1))) {
          const i2 = inds.get(n2)!;
          for (const n3 of layer.slice(i + j + 2)) {
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
    }

    // FIXME set timeout for lp solver

    // add constraints so final ordering is valid
    for (const [ind, layer] of entries(slice(layers, 0, layers.length - 1))) {
      for (const mult of layer) {
        if (mult.data.role !== "node" || mult.data.bottomLayer === ind) {
          continue; // only use non-bottom layer for no-crossings
        }
        const mi = inds.get(mult)!;
        let pflip = true;
        for (const par of layer) {
          if (par === mult) {
            pflip = false;
          } else if (par.data.role !== "node" || par.data.bottomLayer === ind) {
            // impossible to cross if p2 is also multi-layer
            const pi = inds.get(par)!;
            const pkey = pflip ? pair(pi, mi) : pair(mi, pi);
            for (const child of par.children()) {
              const ci = inds.get(child)!;
              const cflip = ci < mi;
              const ckey = cflip ? pair(ci, mi) : pair(mi, ci);

              const cons = `${mi} : ${pi} -> ${ci}`;
              if (pflip === cflip) {
                // same direction, so parent === child
                constraints[cons] = { equal: 0 };
                variables[pkey][cons] = 1;
                variables[ckey][cons] = -1;
              } else {
                // opposite direction, so prent + child === 1
                constraints[cons] = { equal: 1 };
                variables[pkey][cons] = 1;
                variables[ckey][cons] = 1;
              }
            }
          }
        }
      }
    }

    // add crossing minimization
    for (const [ind, layer] of entries(slice(layers, 0, layers.length - 1))) {
      for (const [i, p1] of layer.entries()) {
        if (p1.data.role === "node" && p1.data.bottomLayer !== ind) {
          continue; // only use bottom layer for crossings
        }
        const pi1 = inds.get(p1)!;
        for (const p2 of slice(layer, i + 1)) {
          if (p2.data.role === "node" && p2.data.bottomLayer !== ind) {
            continue; // only use bottom layer for crossings
          }
          const pi2 = inds.get(p2)!;
          const pairp = pair(pi1, pi2);

          // iterate over children to determine potential crossings
          const opts = new Map<string, number>();
          for (const [c1, n1] of p1.childCounts()) {
            const ci1 = inds.get(c1)!;
            for (const [c2, n2] of p2.childCounts()) {
              if (c1 === c2) {
                continue;
              }
              const ci2 = inds.get(c2)!;
              const sign = Math.sign(ci1 - ci2);
              const pairc = sign < 0 ? pair(ci1, ci2) : pair(ci2, ci1);
              const old = opts.get(pairc) ?? 0;
              opts.set(pairc, sign * n1 * n2 + old);
            }
          }

          // go over cumulative crossings to assign appropriate variables
          for (const [pairc, opt] of opts) {
            const slack = `slack: ${pairp} : ${pairc}`;
            const slackUp = `${slack} +`;
            const slackDown = `${slack} -`;
            if (opt < 0) {
              variables[slack] = {
                opt: -opt,
                [slackUp]: 1,
                [slackDown]: 1,
              };

              constraints[slackUp] = { min: 0 };
              variables[pairp][slackUp] = 1;
              variables[pairc][slackUp] = -1;

              constraints[slackDown] = { min: 0 };
              variables[pairp][slackDown] = -1;
              variables[pairc][slackDown] = 1;
            } else if (opt > 0) {
              variables[slack] = {
                opt,
                [slackUp]: 1,
                [slackDown]: 1,
              };

              constraints[slackUp] = { min: 1 };
              variables[pairp][slackUp] = 1;
              variables[pairc][slackUp] = 1;

              constraints[slackDown] = { min: -1 };
              variables[pairp][slackDown] = -1;
              variables[pairc][slackDown] = -1;
            }
          }
        }
      }
    }

    // add distance minimization : only set if distance is on
    for (const [unconstrained, groups] of distanceConstraints) {
      for (const node of unconstrained) {
        const ni = inds.get(node)!;
        for (const group of groups) {
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
                const sign = Math.sign(i1 - i2);
                const key = sign < 0 ? pair(i1, i2) : pair(i2, i1);
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
    }

    // check for large input
    // NOTE ideally we could compute these offline, but the remapped keys make
    // this difficult
    const numVari = Object.keys(variables).length;
    const numCons = Object.keys(constraints).length;
    if (options.check !== "oom" && numVari > 2000) {
      throw err`size of dag to decrossOpt is too large and will likely crash instead of complete; you probably want to use a cheaper decrossing strategy for sugiyama like \`sugiyama().decross(decrossTwoLayer())\`, but if you still want to continue you can suppress this check with \`sugiyama().decross(decrossOp().check("oom"))\``;
    } else if (options.check === "fast" && (numVari > 1000 || numCons > 5000)) {
      throw err`size of dag to decrossOpt is too large and will likely not complete; you probably want to use a cheaper decrossing strategy for sugiyama like \`sugiyama().decross(decrossTwoLayer())\`, but if you still want to continue you can suppress this check with \`sugiyama().decross(decrossOp().check("slow"))\``;
    }

    // solve objective
    // NOTE bundling sets this to undefined, and we need it to be settable
    const ordering = solve("opt", "min", variables, constraints, ints);
    /* istanbul ignore next */
    if (!ordering.bounded) {
      throw ierr`optimization result was not bounded`;
    }

    // sort layers
    for (const layer of layers) {
      // NOTE ordering[key] will be 1 if they're in the correct order, but a
      // positive values indicates that these are in the wrong order, thus we
      // also flip the sign of the index difference to account
      layer.sort((n1, n2) => {
        const i1 = inds.get(n1)!;
        const i2 = inds.get(n2)!;
        // NOTE i1 is always < i2 due to the way sort is implemented
        /* istanbul ignore next */
        return i1 < i2
          ? ordering[pair(i1, i2)] || -1
          : -(ordering[pair(i2, i1)] || -1);
      });
    }
  }

  function check(): OptChecking;
  function check(val: OptChecking): DecrossOpt;
  function check(val?: OptChecking): OptChecking | DecrossOpt {
    if (val === undefined) {
      return options.check;
    } else {
      return buildOperator({ ...options, check: val });
    }
  }
  decrossOpt.check = check;

  function dist(): boolean;
  function dist(val: boolean): DecrossOpt;
  function dist(val?: boolean): boolean | DecrossOpt {
    if (val === undefined) {
      return options.dist;
    } else {
      return buildOperator({ ...options, dist: val });
    }
  }
  decrossOpt.dist = dist;

  decrossOpt.d3dagBuiltin = true as const;

  return decrossOpt;
}

/**
 * create a default {@link DecrossOpt}
 *
 * This operator optimally reduces the number of edge crossings, and can
 * optionally reduce the distance between nodes that share a common ancestor.
 * This should produce the best layouts, but due to the complexity can only be
 * run on fairly small graphs.
 *
 * By default it's set to error if the graph is too large. You can relax if it
 * errors with {@link DecrossOpt#check}, but this isn't advised.
 *
 * @example
 * ```ts
 * const layout = sugiyama().decross(decrossOpt().dist(true));
 * ```
 */
export function decrossOpt(...args: never[]): DecrossOpt {
  if (args.length) {
    throw err`got arguments to decrossOpt(${args}); you probably forgot to construct decrossOpt before passing to decross: \`sugiyama().decross(decrossOpt())\`, note the trailing "()"`;
  }
  return buildOperator({ check: "fast", dist: false });
}
