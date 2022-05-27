/**
 * An {@link DecrossOpt} for optimally minimizing the number of crossings.
 *
 * @packageDocumentation
 */
import { Decross } from ".";
import { bigrams } from "../../iters";
import { OptChecking } from "../../layout";
import { Constraint, solve, Variable } from "../../simplex";
import { err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * A {@link sugiyama/decross!Decross} that minimizes the number of crossings.
 *
 * This method brute forces an NP-Complete problem, and as such may run for an
 * exceedingly long time on large graphs. As a result, any graph that is
 * probably too large will throw an error instead of running. Use with care.
 *
 * Create with {@link decrossOpt}.
 *
 * <img alt="optimal decross example" src="media://sugi-simplex-opt-quad.png" width="400">
 */
export interface DecrossOpt extends Decross<unknown, unknown> {
  /**
   * Set the large dag handling
   *
   * If you modify this, the layout may run forever, or may crash. See
   * {@link layout!OptChecking} for more details. (default: `"small"`)
   */
  check(val: OptChecking): DecrossOpt;
  /** Get the current large graph handling value. */
  check(): OptChecking;

  /**
   * Set whether to also minimize distance between nodes that share a parent /
   * child
   *
   * This adds more variables and constraints, and so will make the decrossing
   * step take longer, but will likely produce a better layout as nodes that
   * share common parents or children will be put closer together if it doesn't
   * affect the number of crossings. (default: false)
   */
  dist(val: boolean): DecrossOpt;
  /** get whether the current layout minimized distance */
  dist(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** @internal */
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

    const distanceConstraints: [SugiNode[], SugiNode[][]][] = [];
    for (const [topLayer, bottomLayer] of bigrams(layers)) {
      const topUnconstrained = bottomLayer.filter((node) => !node.nparents());
      const topGroups = topLayer
        .map((node) => [...node.children()])
        .filter((cs) => cs.length > 1);
      distanceConstraints.push([topUnconstrained, topGroups]);

      const bottomUnconstrained = topLayer.filter((n) => !n.nchildren());
      const bottomGroups = bottomLayer
        .map((node) => [...node.parents()])
        .filter((ps) => ps.length > 1);
      distanceConstraints.push([bottomUnconstrained, bottomGroups]);
    }

    // NOTE distance cost for an unconstrained node ina group can't violate
    // all pairs at once, so cost is ~(n/2)^2 not n(n-1)/2
    const maxDistCost =
      distanceConstraints.reduce(
        (cost, [unc, gs]) =>
          gs.reduce((t, cs) => t + cs.length * cs.length, 0) * unc.length,
        0
      ) / 4;
    const distWeight = 1 / (maxDistCost + 1);
    // add small value to objective for preserving the original order of nodes
    const preserveWeight = distWeight / (numVars + 1);

    // initialize model
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};
    const ints: Record<string, 1> = {};

    // map every node to an id for quick access, if one nodes id is less than
    // another it must come before it on the layer, or in a previous layer
    const inds = new Map<SugiNode, number>();
    {
      let i = 0;
      for (const layer of layers) {
        for (const node of layer) {
          inds.set(node, i++);
        }
      }
    }

    /** create a key from nodes */
    function key(...nodes: SugiNode[]): string {
      return nodes
        .map((n) => inds.get(n)!)
        .sort((a, b) => a - b)
        .join(" => ");
    }

    function perms(layer: SugiNode[]): void {
      // add variables for each pair of bottom later nodes indicating if they
      // should be flipped
      for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
        for (const n2 of layer.slice(i + 1)) {
          const pair = key(n1, n2);
          ints[pair] = 1;
          constraints[pair] = {
            max: 1,
          };
          variables[pair] = {
            // add small value to objective for preserving the original order of nodes
            opt: -preserveWeight,
            [pair]: 1,
          };
        }
      }

      // add constraints to enforce triangle inequality, e.g. that if a -> b is 1
      // and b -> c is 1 then a -> c must also be one
      for (const [i, n1] of layer.slice(0, layer.length - 1).entries()) {
        for (const [j, n2] of layer.slice(i + 1).entries()) {
          for (const n3 of layer.slice(i + j + 2)) {
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
    }

    function cross(layer: SugiNode[]): void {
      for (const [i, p1] of layer.slice(0, layer.length - 1).entries()) {
        for (const p2 of layer.slice(i + 1)) {
          const pairp = key(p1, p2);
          for (const c1 of p1.children()) {
            for (const c2 of p2.children()) {
              if (c1 === c2) {
                continue;
              }
              const pairc = key(c1, c2);
              const slack = `slack (${pairp}) (${pairc})`;
              const slackUp = `${slack} +`;
              const slackDown = `${slack} -`;
              variables[slack] = {
                opt: 1,
                [slackUp]: 1,
                [slackDown]: 1,
              };

              const sign = Math.sign(inds.get(c1)! - inds.get(c2)!);
              const flip = Math.max(sign, 0);

              constraints[slackUp] = {
                min: flip,
              };
              variables[pairp][slackUp] = 1;
              variables[pairc][slackUp] = sign;

              constraints[slackDown] = {
                min: -flip,
              };
              variables[pairp][slackDown] = -1;
              variables[pairc][slackDown] = -sign;
            }
          }
        }
      }
    }

    function distance(unconstrained: SugiNode[], groups: SugiNode[][]): void {
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

    // add variables and permutation invariants
    for (const layer of layers) {
      perms(layer);
    }

    // add crossing minimization
    for (const layer of layers.slice(0, layers.length - 1)) {
      cross(layer);
    }

    // add distance minimization
    if (options.dist) {
      for (const [unconstrained, groups] of distanceConstraints) {
        distance(unconstrained, groups);
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

    // solve objective
    // NOTE bundling sets this to undefined, and we need it to be settable
    const ordering = solve("opt", "min", variables, constraints, ints);

    // sort layers
    for (const layer of layers) {
      layer.sort((n1, n2) => ordering[key(n1, n2)] || -1);
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
 * Create a default {@link DecrossOpt}
 *
 * - {@link DecrossOpt#check | `check()`}: `"fast"`
 * - {@link DecrossOpt#dist | `dist()`}: `false`
 */
export function decrossOpt(...args: never[]): DecrossOpt {
  if (args.length) {
    throw err`got arguments to decrossOpt(${args}); you probably forgot to construct decrossOpt before passing to decross: \`sugiyama().decross(decrossOpt())\`, note the trailing "()"`;
  }
  return buildOperator({ check: "fast", dist: false });
}
